"use client";

import {
  EndSensitivity,
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
  StartSensitivity,
  TurnCoverage,
} from "@google/genai";
import { MicCapture, SpeakerPlayback, VoiceActivityGate } from "./audio";
import { buildSystemInstruction } from "./prompts";
import { loadProfile, profileToPromptText } from "./profile";
import { dispatchToolCall, functionDeclarations, ToolUIHandlers } from "./tools";

export type SessionStatus = "idle" | "connecting" | "live" | "error" | "closed";

export interface TranscriptEntry {
  id: number;
  role: "user" | "agent";
  text: string;
  final: boolean;
  /** App-injected "[system note] …" turns — never shown in any UI. */
  hidden?: boolean;
}

export interface LiveClientEvents extends ToolUIHandlers {
  onStatus: (status: SessionStatus, detail?: string) => void;
  onTranscript: (entries: TranscriptEntry[]) => void;
  onSpeakingChange: (speaking: boolean) => void;
  /** Fires roughly once per second, driven by the mic audio thread. */
  onMicTick?: () => void;
  onHighlightRetry?: () => void;
}

export class JanSewakLive {
  private session: Session | null = null;
  private mic = new MicCapture();
  // Interruptions need more evidence than a normal user turn: a noisy room
  // can contain clinks and knocks, but they must never cut off the assistant.
  private interruptionGate = new VoiceActivityGate(0.04, 8);
  readonly playback = new SpeakerPlayback();
  private events: LiveClientEvents;
  private transcript: TranscriptEntry[] = [];
  private entryId = 0;
  private currentUser: TranscriptEntry | null = null;
  private currentAgent: TranscriptEntry | null = null;
  private resumptionHandle: string | null = null;
  private closingIntentionally = false;
  private micChunks = 0;
  private open = false;
  private audioStarted = false;
  private reconnectAttempts = 0;
  private lastLanguage = "Hindi";
  private model = "";
  private portalLinkShown = false;
  private highlightFailures = 0;
  private dropdownActive = false;
  /** Screen guidance waits for its first validated CTA/text-field target. */
  private screenFrameVersion = 0;
  status: SessionStatus = "idle";

  constructor(events: LiveClientEvents) {
    this.events = events;
  }

  private setStatus(status: SessionStatus, detail?: string) {
    this.status = status;
    this.events.onStatus(status, detail);
  }

  /** Sends only while the socket is open; a dead session drops input silently. */
  private safeSend(input: Parameters<Session["sendRealtimeInput"]>[0]) {
    if (!this.open || !this.session) return;
    try {
      this.session.sendRealtimeInput(input);
    } catch {
      this.open = false;
    }
  }

  async connect(language: string): Promise<void> {
    this.closingIntentionally = false;
    this.lastLanguage = language;
    this.setStatus("connecting");

    let token: string, model: string;
    try {
      const res = await fetch("/api/token");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token request failed");
      token = data.token;
      model = data.model;
    } catch (err) {
      // During a reconnect, a transient token failure shouldn't end the session.
      if (this.reconnectAttempts > 0 && this.reconnectAttempts < 3 && !this.closingIntentionally) {
        this.reconnectAttempts++;
        setTimeout(() => {
          if (!this.closingIntentionally) void this.connect(language);
        }, 1000 * this.reconnectAttempts);
        return;
      }
      this.setStatus("error", err instanceof Error ? err.message : "Could not reach the token service.");
      return;
    }
    this.model = model;

    try {
      // Audio pipelines survive reconnects — only start them once.
      if (!this.audioStarted) await this.playback.start();

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      this.session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Aoede — a soft, clearly female voice (Kore read as ambiguous in Hindi)
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: buildSystemInstruction(language, profileToPromptText(loadProfile())),
          tools: [{ googleSearch: {} }, { functionDeclarations }],
          // HIGH so she can actually read dense portal text (form labels,
          // menu items) — at MEDIUM she couldn't and invented steps instead.
          // Screen frames refresh at a bounded one-second cadence.
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
          // Live guidance needs immediate tool calls. The structured tool
          // contract supplies the guardrails, so avoid thinking latency.
          thinkingConfig: { thinkingBudget: 0 },
          // Lets Live ignore incidental event noise rather than treating every
          // surrounding sound as a request.
          // Snappier turn-taking: detect end-of-speech aggressively and only
          // wait 300ms of silence before replying.
          realtimeInputConfig: {
            turnCoverage: TurnCoverage.TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO,
            automaticActivityDetection: {
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
              prefixPaddingMs: 40,
              silenceDurationMs: 300,
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
          contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
          onopen: () => {
            this.open = true;
            this.reconnectAttempts = 0;
            this.setStatus("live");
          },
          onmessage: (msg) => this.handleMessage(msg),
          onerror: (e) => {
            // onclose follows and owns status/reconnect decisions.
            console.error("Live session error", e);
          },
          onclose: (e) => {
            this.open = false;
            this.playback.flush();
            this.events.onSpeakingChange(false);
            if (this.closingIntentionally) return;
            const reason = e?.reason || "Connection lost";
            // Sessions on the preview model occasionally die ("Internal error
            // occurred."). Reconnect with the resumption handle so the
            // conversation continues where it left off.
            if (this.reconnectAttempts < 3) {
              this.reconnectAttempts++;
              this.setStatus("connecting", `फिर से जुड़ रही हूँ… reconnecting (${this.reconnectAttempts}/3)`);
              setTimeout(() => {
                if (!this.closingIntentionally) void this.connect(this.lastLanguage);
              }, 700 * this.reconnectAttempts);
            } else {
              this.setStatus("closed", reason);
            }
          },
        },
      });

      if (!this.audioStarted) {
        this.audioStarted = true;
        await this.mic.start((base64Pcm, rms) => {
          // ~1s heartbeat driven by the audio thread. Unlike setInterval, this
          // keeps firing when the tab is backgrounded (user is on the govt
          // site's tab), so screen captures stay regular in guide mode.
          if (++this.micChunks % 16 === 0) this.events.onMicTick?.();
          // Echo gate: Chrome's echo cancellation does not reliably remove
          // WebAudio playback from the mic, and mic AGC amplifies the residue.
          // While the agent is speaking (including the speaker-latency tail),
          // require eight sustained, loud chunks (~512ms) before treating sound
          // as a user interruption. A cup, keyboard tap, or bump is a short
          // spike and is never sent to Live.
          if (this.playback.isSpeaking) {
            const interruption = this.interruptionGate.filter(base64Pcm, rms);
            if (interruption.length === 0) return;
            this.playback.flush();
            this.events.onSpeakingChange(false);
            this.interruptionGate.reset();
            for (const audio of interruption) {
              this.safeSend({ audio: { data: audio, mimeType: "audio/pcm;rate=16000" } });
            }
            return;
          }
          this.interruptionGate.reset();
          // Once the user has the floor, stream every chunk to Gemini. Its
          // server-side VAD is much better at spotting the end of speech amid
          // room ambience than a browser-side RMS gate.
          this.safeSend({ audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" } });
        });
      }
    } catch (err) {
      console.error("Failed to start live session", err);
      this.setStatus(
        "error",
        err instanceof Error ? err.message : "Could not start the voice session. Check mic permission.",
      );
      this.disconnect();
    }
  }

  private pushTranscript() {
    this.events.onTranscript([...this.transcript]);
  }

  private handleMessage(msg: LiveServerMessage) {
    const content = msg.serverContent;

    if (content?.inputTranscription?.text) {
      this.highlightFailures = 0;
      if (!this.currentUser) {
        this.currentUser = { id: ++this.entryId, role: "user", text: "", final: false };
        this.transcript.push(this.currentUser);
      }
      this.currentUser.text += content.inputTranscription.text;
      // App-injected system notes start with "[" — spoken words never do.
      if (this.currentUser.text.startsWith("[") || this.currentUser.text.includes("[system note]")) {
        this.currentUser.hidden = true;
      }
      this.pushTranscript();
    }

    if (content?.outputTranscription?.text) {
      if (!this.currentAgent) {
        this.currentAgent = { id: ++this.entryId, role: "agent", text: "", final: false };
        this.transcript.push(this.currentAgent);
      }
      this.currentAgent.text += content.outputTranscription.text;
      this.pushTranscript();
    }

    if (content?.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          // A new assistant turn starts with a fresh interruption window.
          if (!this.playback.isSpeaking) this.interruptionGate.reset();
          this.playback.enqueue(part.inlineData.data);
          this.events.onSpeakingChange(true);
        }
      }
    }

    if (content?.interrupted) {
      this.interruptionGate.reset();
      this.playback.flush();
      this.events.onSpeakingChange(false);
    }

    if (content?.turnComplete) {
      if (this.currentUser) this.currentUser.final = true;
      if (this.currentAgent) this.currentAgent.final = true;
      this.currentUser = null;
      this.currentAgent = null;
      this.pushTranscript();
      this.events.onSpeakingChange(false);
    }

    if (msg.toolCall?.functionCalls) {
      const responses = msg.toolCall.functionCalls.map((fc) => {
        const args = (fc.args ?? {}) as Record<string, unknown>;
        if (fc.name === "provide_text" && this.dropdownActive) {
          return { id: fc.id, name: fc.name, response: {
            shown: false,
            note: "The current control is a dropdown. Tell the user in their language to find and click the saved option; never say copy or paste. Highlight the next text input before offering a copy chip for it.",
          } };
        }
        if ((fc.name === "start_screen_guide" ||
            (fc.name === "suggest_action" && args.kind === "start_guide")) && !this.portalLinkShown) {
          return { id: fc.id, name: fc.name, response: {
            error: "Show the relevant portal link first using suggest_action with kind open_url and a URL. Only then offer screen sharing. Ask which service they need if the destination is unknown.",
          } };
        }
        const response = dispatchToolCall(fc.name ?? "", (fc.args ?? {}) as Record<string, unknown>, this.events);
        if (fc.name === "highlight_region") {
          if (response.highlighted === true) {
            this.dropdownActive = args.target_kind === "dropdown";
            this.highlightFailures = 0;
          } else {
            this.highlightFailures++;
            const retry = this.highlightFailures <= 2;
            if (retry) this.events.onHighlightRetry?.();
            response.retry = retry;
            response.recovery = retry
              ? "Recover silently: a fresh screenshot has been requested. Read the latest image and call highlight_region again with corrected coordinates and the exact visible label. Do not say sorry, apologize, explain the tool failure, or speak a step before success."
              : "Stop retrying this target. Without mentioning a highlight failure or apologizing, ask one short useful request in the user's language, such as moving the guide window aside or scrolling to reveal the field. Wait for their response.";
          }
        }
        if (fc.name === "suggest_action" && args.kind === "open_url" &&
            typeof args.url === "string" && /^(https:\/\/|\/)/.test(args.url) && response.shown === true) {
          this.portalLinkShown = true;
        }
        if (fc.name === "set_language" && typeof args.language === "string" && response.ok === true) {
          this.lastLanguage = args.language;
        }
        return { id: fc.id, name: fc.name, response };
      });
      try {
        this.session?.sendToolResponse({ functionResponses: responses });
      } catch {
        /* session died mid-call; reconnect flow handles it */
      }
    }

    if (msg.sessionResumptionUpdate?.resumable && msg.sessionResumptionUpdate.newHandle) {
      this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
    }

    if (msg.goAway) {
      // Server is about to drop us; note it so the UI can offer reconnect.
      console.warn("Live session goAway; timeLeft:", msg.goAway.timeLeft);
    }
  }

  sendScreenFrame(base64Jpeg: string) {
    this.screenFrameVersion++;
    // Do not interrupt native playback when a new screenshot arrives. Portal
    // animations and caret blinks can trigger a frame while Gemini's prior
    // validated instruction is still being heard, which made PiP silent.
    this.safeSend({ video: { data: base64Jpeg, mimeType: "image/jpeg" } });
  }

  stopScreenGuidance() {
    this.dropdownActive = false;
    this.screenFrameVersion = 0;
    this.safeSend({ text: "[system note] Screen sharing is now OFF. Do not use earlier images for current-page guidance." });
  }

  /** Send a typed text message (used for quick prompts / accessibility). */
  sendText(text: string) {
    this.highlightFailures = 0;
    this.safeSend({ text });
  }

  setMicMuted(muted: boolean) {
    this.mic.setMuted(muted);
    if (muted) {
      this.interruptionGate.reset();
      this.safeSend({ audioStreamEnd: true });
    }
  }

  get modelName() {
    return this.model;
  }

  disconnect() {
    this.dropdownActive = false;
    this.highlightFailures = 0;
    this.portalLinkShown = false;
    this.closingIntentionally = true;
    this.open = false;
    this.audioStarted = false;
    this.interruptionGate.reset();
    this.screenFrameVersion = 0;
    this.mic.stop();
    this.playback.stop();
    try {
      this.session?.close();
    } catch {
      /* already closed */
    }
    this.session = null;
    this.setStatus("idle");
  }
}
