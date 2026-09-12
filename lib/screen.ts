/**
 * Screen-share capture for guide mode: grabs the user's chosen tab/window via
 * getDisplayMedia and streams JPEG frames to the live session.
 *
 * Frames refresh at a bounded cadence even on static pages, so the model
 * receives current field contents when the user asks for help.
 */
export class ScreenShare {
  stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onFrame: ((base64Jpeg: string) => void) | null = null;
  private lastCaptureAt = 0;
  private encoding = false;
  onEnded: (() => void) | null = null;
  /** Runs only after the first image has been encoded and sent to Live. */
  onFirstFrame: (() => void) | null = null;
  private sentFirstFrame = false;

  private static readonly MIN_CAPTURE_MS = 1000;

  get active(): boolean {
    return !!this.stream;
  }

  async start(onFrame: (base64Jpeg: string) => void): Promise<MediaStream> {
    this.onFrame = onFrame;
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 5 },
      audio: false,
      // Prefer sharing a browser tab; hint supported in Chromium.
      // @ts-expect-error - not yet in TS lib
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
    });

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.muted = true;
    await this.video.play();

    this.canvas = document.createElement("canvas");
    const track = this.stream.getVideoTracks()[0];
    track.addEventListener("ended", () => {
      this.stop();
      this.onEnded?.();
    });

    this.capture(true);
    // Fallback driver for backgrounded guide sessions.
    this.timer = setInterval(() => this.capture(), 1000);
    return this.stream;
  }

  /** Capture at most once per second, or immediately for a highlight retry. */
  capture(force = false) {
    const now = performance.now();
    if (!this.video || !this.canvas || this.video.videoWidth === 0 || this.encoding) return;
    if (!force && now - this.lastCaptureAt < ScreenShare.MIN_CAPTURE_MS) return;
    this.lastCaptureAt = now;


    // Govt portals are dense; below ~1280px form labels blur and the model
    // starts guessing instead of reading the screen.
    const maxW = 1280;
    const scale = Math.min(1, maxW / this.video.videoWidth);
    const w = Math.round(this.video.videoWidth * scale);
    const h = Math.round(this.video.videoHeight * scale);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(this.video, 0, 0, w, h);

    // Async JPEG encode keeps the main thread free — a synchronous
    // toDataURL here caused audible jitter in the voice pipeline.
    this.encoding = true;
    this.canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.encoding = false;
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          this.encoding = false;
          const dataUrl = reader.result as string;
          this.onFrame?.(dataUrl.slice(dataUrl.indexOf(",") + 1));
          if (!this.sentFirstFrame) {
            this.sentFirstFrame = true;
            this.onFirstFrame?.();
          }
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.75,
    );
  }

  /**
   * Sanity-check a model-proposed highlight box (0-1000 grid) against the
   * LAST captured frame: a box over an actual button/link/field has texture
   * (text, edges); a box on blank page/desktop is near-uniform. Returns the
   * luma standard deviation of the crop, or null if no frame is available.
   */
  regionStddev(ymin: number, xmin: number, ymax: number, xmax: number): number | null {
    if (!this.canvas || this.canvas.width === 0) return null;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const x = Math.max(0, Math.min(W - 2, Math.round((xmin / 1000) * W)));
    const y = Math.max(0, Math.min(H - 2, Math.round((ymin / 1000) * H)));
    const w = Math.max(2, Math.min(W - x, Math.round(((xmax - xmin) / 1000) * W)));
    const h = Math.max(2, Math.min(H - y, Math.round(((ymax - ymin) / 1000) * H)));
    const px = ctx.getImageData(x, y, w, h).data;
    const stride = Math.max(1, Math.floor((w * h) / 4000)); // sample ≤~4k px
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < w * h; i += stride) {
      const o = i * 4;
      const luma = (px[o] * 3 + px[o + 1] * 4 + px[o + 2]) >> 3;
      sum += luma;
      sumSq += luma * luma;
      n++;
    }
    if (n < 4) return null;
    const mean = sum / n;
    return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video?.remove();
    this.video = null;
    this.canvas = null;
    this.sentFirstFrame = false;
    this.onFirstFrame = null;
    this.onFrame = null;
  }
}
