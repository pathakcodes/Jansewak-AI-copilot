/**
 * Microphone capture (16kHz PCM16 chunks) and model-audio playback (24kHz)
 * for the Gemini Live session. Playback exposes a level meter that drives
 * the avatar's mouth animation.
 */

const WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.samples = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.buffer.push(new Float32Array(input[0]));
      this.samples += input[0].length;
      // 64ms at 16kHz: deliver the user's words sooner.
      if (this.samples >= 1024) {
        const merged = new Float32Array(this.samples);
        let off = 0;
        for (const chunk of this.buffer) { merged.set(chunk, off); off += chunk.length; }
        this.port.postMessage(merged, [merged.buffer]);
        this.buffer = [];
        this.samples = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

function floatTo16BitPcmBase64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Suppress room noise before it reaches the Live API. A single loud chunk can
 * be a click or bump, so a turn starts only after several adjacent speech-level
 * chunks. Once started, a short silence hangover preserves natural pauses
 * between words.
 */
export class VoiceActivityGate {
  private pending: string[] = [];
  private active = false;
  private quietChunks = 0;
  private static readonly RELEASE_CHUNKS = 10;

  constructor(
    private readonly startRms = 0.025,
    private readonly startChunks = 6,
  ) {}

  /**
   * A gate can be tuned separately for normal speech and an interruption.
   * The interruption gate deliberately needs a longer sustained signal so
   * event noise such as cup clinks cannot cancel JanSewak mid-sentence.
   */
  filter(base64Pcm: string, rms: number): string[] {
    if (rms >= this.startRms) {
      this.quietChunks = 0;
      if (this.active) return [base64Pcm];

      this.pending.push(base64Pcm);
      if (this.pending.length < this.startChunks) return [];

      this.active = true;
      const chunks = this.pending;
      this.pending = [];
      return chunks;
    }

    this.pending = [];
    if (!this.active) return [];

    this.quietChunks++;
    const chunks = [base64Pcm];
    if (this.quietChunks >= VoiceActivityGate.RELEASE_CHUNKS) {
      this.active = false;
      this.quietChunks = 0;
    }
    return chunks;
  }

  reset() {
    this.pending = [];
    this.active = false;
    this.quietChunks = 0;
  }

  /** Continue forwarding after another gate has already qualified the turn. */
  activate() {
    this.pending = [];
    this.active = true;
    this.quietChunks = 0;
  }
}

export class MicCapture {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  muted = false;

  async start(onChunk: (base64Pcm: string, rms: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.context = new AudioContext({ sampleRate: 16000 });
    const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
    await this.context.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    this.sourceNode = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, "pcm-capture");
    this.workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (this.muted) return;
      let sum = 0;
      for (let i = 0; i < e.data.length; i++) sum += e.data[i] * e.data[i];
      const rms = Math.sqrt(sum / e.data.length);
      onChunk(floatTo16BitPcmBase64(e.data), rms);
    };
    this.sourceNode.connect(this.workletNode);
    // Worklet has no output; no need to connect to destination.
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  stop() {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.context?.close().catch(() => {});
    this.context = null;
    this.stream = null;
    this.workletNode = null;
    this.sourceNode = null;
  }
}

export class SpeakerPlayback {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private levelData: Uint8Array<ArrayBuffer> | null = null;
  // Speakers keep emitting sound for a beat after the last buffer "ends" on
  // the audio clock (output latency + room echo). Track when audio truly goes
  // quiet so the mic's echo gate covers that tail — otherwise her own tail
  // echo reads as a new user turn and she answers it by repeating herself.
  private tailUntil = 0;
  private static readonly TAIL_MS = 400;

  async start(): Promise<void> {
    this.context = new AudioContext({ sampleRate: 24000, latencyHint: "interactive" });
    this.gain = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.6;
    this.levelData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.gain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    if (this.context.state === "suspended") await this.context.resume();
    this.nextStartTime = 0;
  }

  /** Queue a base64 chunk of 24kHz 16-bit PCM from the model. */
  enqueue(base64Pcm: string) {
    if (!this.context || !this.gain) return;
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

    const buffer = this.context.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    const now = this.context.currentTime;
    // Add 60ms only when the queue actually runs dry. A nearly drained queue
    // still has contiguous audio; resetting it would introduce another gap.
    if (this.nextStartTime <= now) {
      this.nextStartTime = now + 0.06;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    const remainingMs = (this.nextStartTime - this.context.currentTime) * 1000;
    this.tailUntil = performance.now() + remainingMs + SpeakerPlayback.TAIL_MS;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  /** Stop everything immediately (model was interrupted by the user). */
  flush() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.nextStartTime = 0;
    // A flush means the user is genuinely talking — drop the gate at once so
    // the quiet parts of their speech aren't eaten.
    this.tailUntil = 0;
  }

  /** 0..1 output level, for avatar mouth animation. */
  getLevel(): number {
    if (!this.analyser || !this.levelData) return 0;
    this.analyser.getByteFrequencyData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i++) sum += this.levelData[i];
    return Math.min(1, sum / this.levelData.length / 90);
  }

  get isSpeaking(): boolean {
    return this.sources.size > 0 || performance.now() < this.tailUntil;
  }

  stop() {
    this.flush();
    this.context?.close().catch(() => {});
    this.context = null;
    this.analyser = null;
    this.gain = null;
  }
}
