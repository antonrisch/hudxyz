import { snapdom } from "@zumer/snapdom";
import { waitForIframePaint } from "@/lib/simulator/app-load";
import {
  measureAdditiveBackdrop,
  type AdditiveBackdropGeometry,
} from "@/lib/simulator/additive";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  type BackgroundPreset,
} from "@/lib/simulator/background";
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
  additiveContext?: {
    preset: BackgroundPreset;
    backgroundBrightness: number;
    backgroundBlur: number;
    onBeforeCapture: () => void;
  };
};

type CaptureStageOptions = {
  width?: number;
  height?: number;
  preferPixel?: boolean;
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

async function captureBackdrop(
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

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadCaptureImage(src: string) {
  const href = new URL(src, window.location.origin).href;
  let pending = imageCache.get(href);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", () => reject(new Error(`Could not load image: ${src}`)));
      img.src = href;
    });
    imageCache.set(href, pending);
  }
  return pending;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  if (!sw || !sh) return;

  const imageRatio = sw / sh;
  const rectRatio = w / h;
  let sx: number;
  let sy: number;
  let sWidth: number;
  let sHeight: number;

  if (imageRatio > rectRatio) {
    sHeight = sh;
    sWidth = sHeight * rectRatio;
    sx = (sw - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = sw;
    sHeight = sWidth / rectRatio;
    sx = 0;
    sy = (sh - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

async function paintAdditiveBackdropSlice(
  ctx: CanvasRenderingContext2D,
  preset: BackgroundPreset,
  geometry: AdditiveBackdropGeometry,
  backgroundBrightness: number,
  backgroundBlur: number,
) {
  const blurScale = (preset.image ? BACKDROP_SCALE : 1) * geometry.displayScale;
  const filter = backgroundBackdropFilter(
    preset,
    backgroundBrightness,
    backgroundBlur,
    blurScale,
  );
  if (filter) ctx.filter = filter;

  const { left, top, width, height } = geometry;
  if (preset.image) {
    const img = await loadCaptureImage(preset.image);
    drawImageCover(ctx, img, left, top, width, height);
  } else {
    ctx.fillStyle = stageFillColor();
    ctx.fillRect(left, top, width, height);
  }

  ctx.filter = "none";
}

// Canvas composite at layout resolution (600×600) — snapdom can't screen-blend the iframe
// with the host backdrop slice when the device plane is CSS-scaled.
async function captureAdditiveDisplay(
  iframe: HTMLIFrameElement,
  preset: BackgroundPreset,
  geometry: AdditiveBackdropGeometry,
  backgroundBrightness: number,
  backgroundBlur: number,
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = VIEWPORT;
  canvas.height = VIEWPORT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIEWPORT, VIEWPORT);
  ctx.clip();
  await paintAdditiveBackdropSlice(ctx, preset, geometry, backgroundBrightness, backgroundBlur);
  ctx.restore();

  const waveguide = await captureWaveguide(iframe);
  if (!waveguide) return canvas;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(waveguide, 0, 0, VIEWPORT, VIEWPORT);
  ctx.restore();

  return canvas;
}

function setVisibility(nodes: Iterable<Element>, visible: boolean) {
  for (const node of nodes) {
    (node as HTMLElement).style.visibility = visible ? "" : "hidden";
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

  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;
  const ctx = frame.getContext("2d");
  if (!ctx) return null;

  if (additive && display && iframe && target.additiveContext) {
    const { preset, backgroundBrightness, backgroundBlur, onBeforeCapture } =
      target.additiveContext;
    onBeforeCapture();
    const geometry = measureAdditiveBackdrop(stage, display);
    if (!geometry) return null;

    let bg = backdrop ? await captureBackdrop(backdrop, width, height) : null;

    const slices = display.querySelectorAll("[data-additive-slice]");
    setVisibility(slices, false);
    const iframeWas = iframe.style.visibility;
    iframe.style.visibility = "hidden";
    const chrome = await captureStageChrome(stage, backdrop, width, height);
    setVisibility(slices, true);
    iframe.style.visibility = iframeWas;

    const surface = await captureAdditiveDisplay(
      iframe,
      preset,
      geometry,
      backgroundBrightness,
      backgroundBlur,
    );

    if (bg) ctx.drawImage(bg, 0, 0, width, height);
    else {
      ctx.fillStyle = stageFillColor();
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(chrome, 0, 0);

    if (surface) {
      const { x, y, w, h } = displayRectOnStage(stage, display, width, height);
      ctx.drawImage(surface, x, y, w, h);
    }
    return frame;
  }

  const bg = backdrop ? await captureBackdrop(backdrop, width, height) : null;

  const chrome = await captureStageChrome(stage, backdrop, width, height);

  if (bg) ctx.drawImage(bg, 0, 0, width, height);
  else {
    ctx.fillStyle = stageFillColor();
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(chrome, 0, 0);

  if (display) {
    const surface = iframe ? await captureWaveguide(iframe) : null;
    if (surface) {
      const { x, y, w, h } = displayRectOnStage(stage, display, width, height);
      ctx.drawImage(surface, x, y, w, h);
    }
  }

  return frame;
}

// Screenshots prefer snapdom (no permission prompt); recording prefers painted pixels.
export async function captureStage(
  target: StageCaptureTarget,
  options: CaptureStageOptions = {},
): Promise<HTMLCanvasElement | null> {
  if (options.preferPixel) {
    const pixels = await captureStagePixels(target.stage);
    if (pixels) return pixels;
    return captureStageSnapdom(target, options);
  }

  const snapdomFrame = await captureStageSnapdom(target, options);
  if (snapdomFrame) return snapdomFrame;
  return captureStagePixels(target.stage);
}

export async function downloadStage(target: StageCaptureTarget): Promise<void> {
  const canvas = await captureStage(target, { preferPixel: false });
  if (!canvas) return;

  const url = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = captureFilename();
  anchor.click();
}
