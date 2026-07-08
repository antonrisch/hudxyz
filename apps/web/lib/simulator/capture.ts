import { snapdom } from "@zumer/snapdom";
import { waitForIframePaint } from "@/lib/simulator/app-load";
import { measureAdditiveBackdrop, type AdditiveBackdropGeometry } from "@/lib/simulator/additive";
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
  frames: SVGSVGElement | null;
  lensTint: boolean;
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

type StageChromeOptions = {
  backdrop: HTMLElement | null;
  frames: SVGSVGElement | null;
  display: HTMLElement | null;
  hideDisplay: boolean;
};

function captureFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `mrbd-${stamp}.png`;
}

function stageFillColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--stage-fill").trim();
  return value || "#1e293b";
}

function lensTintColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--lens-tint").trim();
  return value || "oklch(0.18 0.02 155 / 0.5)";
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

async function captureWaveguide(iframe: HTMLIFrameElement): Promise<HTMLCanvasElement | null> {
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

// Root the snap on the SVG itself — avoids nested-svg + overflow clipping in the stage chrome pass.
async function captureGlassesFrames(svg: SVGSVGElement): Promise<HTMLCanvasElement | null> {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  try {
    return await snapdom.toCanvas(svg, {
      width,
      height,
      dpr: 1,
      fast: true,
      backgroundColor: "transparent",
    });
  } catch (e) {
    console.error("SnapDOM glasses frames capture failed", e);
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
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur, blurScale);
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
  lensTint: boolean,
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
  if (lensTint) {
    const { left, top, width, height } = geometry;
    ctx.fillStyle = lensTintColor();
    ctx.fillRect(left, top, width, height);
  }
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

function stageChromeFilter(options: StageChromeOptions) {
  const { backdrop, frames } = options;
  return (node: Element) => {
    if (backdrop && node === backdrop) return false;
    if (frames && node === frames) return false;
    return true;
  };
}

async function captureStageChrome(
  stage: HTMLElement,
  width: number,
  height: number,
  options: StageChromeOptions,
): Promise<HTMLCanvasElement> {
  const { display, hideDisplay } = options;
  stage.classList.remove("bg-stage-fill");
  const displayWas = hideDisplay && display ? display.style.visibility : null;
  if (hideDisplay && display) display.style.visibility = "hidden";

  try {
    return await snapdom.toCanvas(stage, {
      width,
      height,
      dpr: 1,
      fast: true,
      exclude: ["iframe"],
      excludeMode: "remove",
      filter: stageChromeFilter(options),
      backgroundColor: "transparent",
    });
  } finally {
    if (hideDisplay && display) display.style.visibility = displayWas ?? "";
    stage.classList.add("bg-stage-fill");
  }
}

function elementRectOnStage(
  stage: HTMLElement,
  element: Element,
  canvasWidth: number,
  canvasHeight: number,
) {
  const stageRect = stage.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const scaleX = canvasWidth / stageRect.width;
  const scaleY = canvasHeight / stageRect.height;
  return {
    x: (elementRect.left - stageRect.left) * scaleX,
    y: (elementRect.top - stageRect.top) * scaleY,
    w: elementRect.width * scaleX,
    h: elementRect.height * scaleY,
  };
}

function drawCanvasOnStage(
  ctx: CanvasRenderingContext2D,
  stage: HTMLElement,
  element: Element,
  source: CanvasImageSource,
  canvasWidth: number,
  canvasHeight: number,
) {
  const { x, y, w, h } = elementRectOnStage(stage, element, canvasWidth, canvasHeight);
  ctx.drawImage(source, x, y, w, h);
}

function paintStageBackground(
  ctx: CanvasRenderingContext2D,
  bg: HTMLCanvasElement | null,
  width: number,
  height: number,
) {
  if (bg) ctx.drawImage(bg, 0, 0, width, height);
  else {
    ctx.fillStyle = stageFillColor();
    ctx.fillRect(0, 0, width, height);
  }
}

// Snapdom fallback when tab capture is unavailable or denied.
export async function captureStageSnapdom(
  target: StageCaptureTarget,
  options: CaptureStageOptions = {},
): Promise<HTMLCanvasElement | null> {
  const { stage, backdrop, display, iframe, frames, lensTint, additive } = target;
  const stageRect = stage.getBoundingClientRect();
  const width = options.width ?? Math.max(1, Math.round(stageRect.width));
  const height = options.height ?? Math.max(1, Math.round(stageRect.height));

  if (iframe) await waitForIframePaint(iframe, () => false);

  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;
  const ctx = frame.getContext("2d");
  if (!ctx) return null;

  const chromeOptions: StageChromeOptions = {
    backdrop,
    frames,
    display,
    hideDisplay: Boolean(display && iframe),
  };

  const glassesFrames = frames ? await captureGlassesFrames(frames) : null;

  if (additive && display && iframe && target.additiveContext) {
    const { preset, backgroundBrightness, backgroundBlur, onBeforeCapture } =
      target.additiveContext;
    onBeforeCapture();
    const geometry = measureAdditiveBackdrop(stage, display);
    if (!geometry) return null;

    const bg = backdrop ? await captureBackdrop(backdrop, width, height) : null;

    const slices = display.querySelectorAll("[data-additive-slice]");
    setVisibility(slices, false);
    const iframeWas = iframe.style.visibility;
    iframe.style.visibility = "hidden";
    const chrome = await captureStageChrome(stage, width, height, chromeOptions);
    setVisibility(slices, true);
    iframe.style.visibility = iframeWas;

    const surface = await captureAdditiveDisplay(
      iframe,
      preset,
      geometry,
      backgroundBrightness,
      backgroundBlur,
      lensTint,
    );

    paintStageBackground(ctx, bg, width, height);
    if (glassesFrames && frames) {
      drawCanvasOnStage(ctx, stage, frames, glassesFrames, width, height);
    }
    if (surface) drawCanvasOnStage(ctx, stage, display, surface, width, height);
    ctx.drawImage(chrome, 0, 0);
    return frame;
  }

  const bg = backdrop ? await captureBackdrop(backdrop, width, height) : null;
  const chrome = await captureStageChrome(stage, width, height, chromeOptions);
  const surface = iframe ? await captureWaveguide(iframe) : null;

  paintStageBackground(ctx, bg, width, height);
  if (glassesFrames && frames) {
    drawCanvasOnStage(ctx, stage, frames, glassesFrames, width, height);
  }
  if (surface && display) drawCanvasOnStage(ctx, stage, display, surface, width, height);
  ctx.drawImage(chrome, 0, 0);

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
