"use client";

/** Document Picture-in-Picture helpers (Chromium). */

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number; disallowReturnToOpener?: boolean }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function isDocumentPipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/** Opens a PiP window with the page's styles cloned into it. */
export async function openPipWindow(width = 400, height = 560): Promise<Window | null> {
  if (!isDocumentPipSupported()) return null;
  const pipWindow = await window.documentPictureInPicture!.requestWindow({ width, height });

  // Clone all stylesheets so Tailwind classes work inside the PiP document.
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const cssRules = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join("");
      const style = pipWindow.document.createElement("style");
      style.textContent = cssRules;
      pipWindow.document.head.appendChild(style);
    } catch {
      // Cross-origin stylesheet: fall back to a link element.
      const owner = styleSheet.ownerNode as HTMLLinkElement | null;
      if (owner?.href) {
        const link = pipWindow.document.createElement("link");
        link.rel = "stylesheet";
        link.href = owner.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  }

  pipWindow.document.title = "JanSewak Guide";
  pipWindow.document.body.style.margin = "0";
  return pipWindow;
}
