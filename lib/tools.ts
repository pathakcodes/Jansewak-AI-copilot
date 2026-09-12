import { FunctionDeclaration, Type } from "@google/genai";
import { lookupKnowledge } from "./knowledge/portals";
import { loadProfile, profileValueForField } from "./profile";

/* ---------- UI event types emitted when the model calls a tool ---------- */

export interface SuggestedAction {
  id: string;
  label: string;
  url?: string;
  kind: "open_url" | "start_guide" | "info";
  detail?: string;
}

export interface Highlight {
  targetKind?: "cta" | "text_field" | "dropdown";
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label: string;
  at: number;
}

export interface CopyTextItem {
  id: string;
  text: string;
  fieldHint: string;
}

export interface FileToolConfig {
  targetKb?: number;
  format?: string;
}

export interface ToolUIHandlers {
  onSuggestAction: (action: SuggestedAction) => void;
  onStartScreenGuide: () => void;
  onHighlight: (h: Highlight | null) => void;
  onProvideText: (item: CopyTextItem) => void;
  onSetLanguage: (lang: string) => void;
  onOpenFileTool: (config: FileToolConfig) => void;
  onInstruction: (text: string) => void;
  /** Luma std-dev of the proposed box on the last frame (null = no frame). */
  checkRegion?: (ymin: number, xmin: number, ymax: number, xmax: number) => number | null;
}

/* ---------- Declarations sent to Gemini Live ---------- */

export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "suggest_action",
    description:
      "Show the user a tappable action card, e.g. a button to open a government website in a new tab. Use whenever you recommend a portal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING, description: "Short button label in the user's language, e.g. 'IRCTC खोलें'" },
        url: { type: Type.STRING, description: "Full https URL to open (official portal). Omit for non-link actions." },
        kind: { type: Type.STRING, description: "'open_url' | 'start_guide' | 'info'" },
        detail: { type: Type.STRING, description: "One-line explanation shown under the label." },
      },
      required: ["label", "kind"],
    },
  },
  {
    name: "start_screen_guide",
    description:
      "Ask the browser to start screen sharing and open the floating guide window, so you can see the user's screen and guide them. Call after the user agrees to be guided.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "highlight_region",
    description:
      "Draw a pulsing highlight box with a label over a region of the user's shared screen, as seen in the most recent frame. Coordinates are FRACTIONS of the full frame ×1000 (NOT pixels): (0,0) is the top-left corner, ymin/ymax measure from the top edge (0=top, 1000=bottom), xmin/xmax from the left. Example: a button in the vertical middle of the page has ymin≈460, ymax≈540. Make the box TIGHT around the one element you mean. You MUST pass visible_text: the exact words you can read inside the box on the LATEST frame — calls without it are rejected, and so are boxes that land on a blank part of the frame. If you cannot read the element's text on the frame, you cannot highlight or mention it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ymin: { type: Type.NUMBER },
        xmin: { type: Type.NUMBER },
        ymax: { type: Type.NUMBER },
        xmax: { type: Type.NUMBER },
        visible_text: {
          type: Type.STRING,
          description:
            "The exact text you read inside this box on the most recent frame (button/link/field label, verbatim). Proof you are looking at the screen, not memory.",
        },
        label: { type: Type.STRING, description: "Very short label in the user's language, e.g. 'यहाँ क्लिक करें'" },
        target_kind: {
          type: Type.STRING,
          description: "Use 'cta' for a visible button/link/checkbox, 'text_field' for a text input, or 'dropdown' for a select/combobox or its visible option. Dropdowns require finding and clicking an option, never copy-paste. Do not target headings, paragraphs, images, or empty space.",
        },
        instruction: {
          type: Type.STRING,
          description: "The current step as one short written sentence, shown in the guide window.",
        },
      },
      required: ["ymin", "xmin", "ymax", "xmax", "visible_text", "label", "target_kind", "instruction"],
    },
  },
  {
    name: "provide_text",
    description:
      "Give the user exact text to copy-paste into a form field (names, addresses, complaint text…). Transliterate to the script the form needs. The text appears as a copy chip in the guide window.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The exact text to paste." },
        field_hint: { type: Type.STRING, description: "Which field it is for, short, e.g. 'Name (नाम)'" },
      },
      required: ["text", "field_hint"],
    },
  },
  {
    name: "set_language",
    description: "Record that the conversation language changed (user chose or asked to switch). Updates UI labels.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: "Language name in English, e.g. 'Marathi'" },
      },
      required: ["language"],
    },
  },
  {
    name: "open_file_tool",
    description:
      "Open the built-in file utility (photo/signature/document resize, compress to a KB limit, format conversion) pre-configured for what the government form needs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_kb: { type: Type.NUMBER, description: "Max file size in KB the form allows, e.g. 50" },
        format: { type: Type.STRING, description: "Required format, e.g. 'jpeg' or 'png'" },
      },
    },
  },
  {
    name: "lookup_knowledge",
    description:
      "Search JanSewak's knowledge base of Indian government portals and step-by-step guides. Call this FIRST for any portal-related task.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "What the user wants, e.g. 'book train ticket IRCTC'" },
      },
      required: ["query"],
    },
  },
];

let idCounter = 0;
const nextId = () => `t${++idCounter}`;

/**
 * Executes a tool call from the model: updates the UI via handlers and
 * returns the result object to send back to the session.
 */
export function dispatchToolCall(
  name: string,
  args: Record<string, unknown>,
  ui: ToolUIHandlers,
): Record<string, unknown> {
  switch (name) {
    case "suggest_action": {
      ui.onSuggestAction({
        id: nextId(),
        label: String(args.label ?? "Open"),
        url: args.url ? String(args.url) : undefined,
        kind: (args.kind as SuggestedAction["kind"]) ?? "info",
        detail: args.detail ? String(args.detail) : undefined,
      });
      return { shown: true };
    }
    case "start_screen_guide": {
      ui.onStartScreenGuide();
      return { status: "screen share requested from user" };
    }
    case "highlight_region": {
      // Grounding contract: no visible_text = the model is reciting from
      // memory, not reading the frame. Reject so it re-looks at the screen.
      const visibleText = String(args.visible_text ?? "").trim();
      if (!visibleText) {
        return {
          error:
            "REJECTED — no visible_text. Look at the LATEST screen frame, read the exact text of the element you mean, and call highlight_region again with it. If you cannot find or read the element on the frame, do NOT mention it: say what you actually see and ask the user to scroll.",
        };
      }
      const instruction = String(args.instruction ?? "").trim();
      if (!instruction) {
        return {
          error:
            "REJECTED — a highlight needs one short instruction. Do not speak outside the tool; put the exact, screen-grounded instruction in highlight_region.instruction.",
        };
      }
      const targetKind = String(args.target_kind ?? "");
      if (targetKind !== "cta" && targetKind !== "text_field" && targetKind !== "dropdown") {
        return {
          error:
            "REJECTED — set target_kind to cta, text_field or dropdown for a visible interactive control.",
        };
      }
      const ymin = Number(args.ymin);
      const xmin = Number(args.xmin);
      const ymax = Number(args.ymax);
      const xmax = Number(args.xmax);
      if (!(ymax > ymin && xmax > xmin) || ymin < 0 || xmin < 0 || ymax > 1000 || xmax > 1000) {
        return {
          error:
            "REJECTED — invalid coordinates. They must be fractions of the full frame ×1000 (0=top/left edge, 1000=bottom/right edge, ymax>ymin, xmax>xmin), NOT pixels. Look at the latest frame and estimate again.",
        };
      }
      // Calibration check against the real frame: a button/link/field has
      // texture (text, edges); a near-uniform crop means the box missed and
      // landed on blank page or desktop — exactly the miscalibrated-box bug.
      const stddev = ui.checkRegion?.(ymin, xmin, ymax, xmax);
      if (stddev === null || typeof stddev === "undefined") {
        return {
          error:
            "NO CONFIRMED FRAME — do not speak, apologize, or give a step. Wait silently until a current screen image is available, then read the exact visible label and call highlight_region again.",
        };
      }
      if (typeof stddev === "number" && stddev < 6) {
        return {
          error: `REJECTED — that box lands on a blank area of the actual frame, so its coordinates are off. Do not speak, apologize, or give an unhighlighted fallback. Wait for a newer frame, re-read the exact visible label, then try one tight box on the LATEST frame.`,
        };
      }
      ui.onHighlight({
        targetKind,
        ymin,
        xmin,
        ymax,
        xmax,
        // The guide window must show the same words the model claims it read
        // from the screenshot, never an unrelated free-form label.
        label: visibleText,
        at: performance.now(),
      });
      ui.onInstruction(instruction);
      const savedValue = targetKind === "text_field" ? profileValueForField(visibleText, loadProfile()) : undefined;
      if (savedValue) {
        ui.onProvideText({ id: nextId(), text: savedValue, fieldHint: visibleText });
      }
      return {
        highlighted: true,
        copy_shown: !!savedValue,
        note: savedValue
          ? "The matching saved profile value is already visible as a copy chip. Do NOT call provide_text again. Tell the user once to copy it from the guide window into this field, then wait."
          : targetKind === "dropdown"
            ? `Guide selection in the user's language: open the dropdown, find the saved option ${profileValueForField(visibleText, loadProfile()) || "matching the user's request"}, then click it. Do not say copy/paste or call provide_text. Only claim an option is visible if you can read it in the latest image.`
          : targetKind === "text_field"
            ? "No matching saved value was shown. Use provide_text only if the user has supplied the value; otherwise ask for the missing detail."
            : "The highlight is visible. Speak the short instruction now.",
      };
    }
    case "provide_text": {
      const fieldHint = String(args.field_hint ?? "");
      const savedValue = profileValueForField(fieldHint, loadProfile());
      const text = savedValue ?? String(args.text ?? "");
      if (!text.trim()) return { shown: false, note: "No saved value for this field. Ask the user for the missing detail." };
      ui.onProvideText({
        id: nextId(),
        text,
        fieldHint,
      });
      return { shown: true, note: "The copy chip is visible in the guide/PiP window. Tell the user once, in their language, that they can copy it here and paste it into this field. Then wait for them to paste; do not repeat an already-delivered copy instruction." };
    }
    case "set_language": {
      ui.onSetLanguage(String(args.language ?? "Hindi"));
      return { ok: true };
    }
    case "open_file_tool": {
      ui.onOpenFileTool({
        targetKb: args.target_kb ? Number(args.target_kb) : undefined,
        format: args.format ? String(args.format) : undefined,
      });
      return { opened: true };
    }
    case "lookup_knowledge": {
      return { result: lookupKnowledge(String(args.query ?? "")) };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
