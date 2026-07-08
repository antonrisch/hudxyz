import { snapdom } from "@zumer/snapdom";
import { waitForIframePaint } from "@/lib/simulator/app-load";
import { VIEWPORT } from "@/lib/simulator/config";
import { captureStagePixels } from "@/lib/simulator/pixel-capture";

const WAVEGUIDE = {
  width: VIEWPORT,
  height: VIEWPORT,
  dpr: 1,
} as const;

export type StageCaptureTarget = {
  stage: HTMLElement;
  backdrop: HTMLElement | null;
  display: HTMLElement | null;
  iframe: HTMLIFrameElement | null;
  additive: boolean;
};

type CaptureStageOptions = {
  width?: number;
  height?: number;
  cachedBg?: HTMLCanvasElement | null;
};

function captureFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `mrbd-${stamp}.png`;
}

function stageFillColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--stage-fill").trim();
  return value || "#1e293b";
}

function iframeDocument(iframe: HTMLIFrameElement): Document | null {
  try {
    return iframe.contentDocument;
  } catch {
    return null;
  }
}

// Never snap <html> inside a proxied iframe — snapdom re-fetches head assets and scramjet aborts.
function waveguideRoot(doc: Document): HTMLElement {
  return doc.body?.childNodes.length ? doc.body : doc.documentElement;
}

async function captureDisplaySurface(display: HTMLElement): Promise<HTMLCanvasElement | null> {
  try {
    return await snapdom.toCanvas(display, {
      ...WAVEGUIDE,
      fast: true,
      backgroundColor: "transparent",
    });
  } catch (e) {
    console.error("SnapDOM display capture failed", e);
    return null;
  }
}

async function captureWaveguide(
  iframe: HTMLIFrameElement,
): Promise<HTMLCanvasElement | null> {
  const doc = iframeDocument(iframe);
  if (!doc?.body) return null;

  try {
    return await snapdom.toCanvas(waveguideRoot(doc), {
      ...WAVEGUIDE,
      fast: true,
      backgroundColor: "#000",
    });
  } catch (e) {
    console.error("SnapDOM waveguide capture failed", e);
    return null;
  }
}

export async function captureBackdrop(
  backdrop: HTMLElement,
  width: number,
  height: number,
): Promise<HTMLCanvasElement | null> {
  try {
    return await snapdom.toCanvas(backdrop, {
      width,
      height,
      dpr: 1,
      fast: false,
    });
  } catch (e) {
    console.error("SnapDOM backdrop capture failed", e);
    return null;
  }
}

async function captureStageChrome(
  stage: HTMLElement,
  backdrop: HTMLElement | null,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  stage.classList.remove("bg-stage-fill");
  try {
    return await snapdom.toCanvas(stage, {
      width,
      height,
      dpr: 1,
      fast: true,
      exclude: ["iframe"],
      excludeMode: "remove",
      filter: backdrop ? (node) => node !== backdrop : undefined,
      backgroundColor: "transparent",
    });
  } finally {
    stage.classList.add("bg-stage-fill");
  }
}

function displayRectOnStage(
  stage: HTMLElement,
  display: HTMLElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const stageRect = stage.getBoundingClientRect();
  const displayRect = display.getBoundingClientRect();
  const scaleX = canvasWidth / stageRect.width;
  const scaleY = canvasHeight / stageRect.height;
  return {
    x: (displayRect.left - stageRect.left) * scaleX,
    y: (displayRect.top - stageRect.top) * scaleY,
    w: displayRect.width * scaleX,
    h: displayRect.height * scaleY,
  };
}

// Snapdom fallback when tab capture is unavailable or denied.
export async function captureStageSnapdom(
  target: StageCaptureTarget,
  options: CaptureStageOptions = {},
): Promise<HTMLCanvasElement | null> {
  const { stage, backdrop, display, iframe, additive } = target;
  const stageRect = stage.getBoundingClientRect();
  const width = options.width ?? Math.max(1, Math.round(stageRect.width));
  const height = options.height ?? Math.max(1, Math.round(stageRect.height));

  if (iframe) await waitForIframePaint(iframe, () => false);

  let bg = options.cachedBg ?? null;
  if (!bg && backdrop) {
    bg = await captureBackdrop(backdrop, width, height);
  }

  const chrome = await captureStageChrome(stage, backdrop, width, height);

  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;
  const ctx = frame.getContext("2d");
  if (!ctx) return null;

  if (bg) ctx.drawImage(bg, 0, 0, width, height);
  else {
    ctx.fillStyle = stageFillColor();
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(chrome, 0, 0);

  if (display) {
    const surface = additive
      ? await captureDisplaySurface(display)
      : iframe
        ? await captureWaveguide(iframe)
        : null;
    if (surface) {
      const { x, y, w, h } = displayRectOnStage(stage, display, width, height);
      ctx.drawImage(surface, x, y, w, h);
    }
  }

  return frame;
}

// Prefer painted pixels (Meta approach); fall back to layered snapdom without iframe head walks.
export async function captureStage(
  target: StageCaptureTarget,
  options: CaptureStageOptions = {},
): Promise<HTMLCanvasElement | null> {
  const pixels = await captureStagePixels(target.stage);
  if (pixels) return pixels;

  return captureStageSnapdom(target, options);
}

export async function downloadStage(target: StageCaptureTarget): Promise<void> {
  const canvas = await captureStage(target);
  if (!canvas) return;

  const url = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = captureFilename();
  anchor.click();
}
