// custom background photos are resized client-side and held as blob: urls for the host
// canvas. the proxied iframe cannot load blob:/same-origin urls (scramjet aborts them), so
// we read the blob in the parent and inject a compressed data: url into iframe css instead.

import { BACKGROUNDS } from "@/lib/emulator/background";

export const CSS_DATA_URL_BUDGET = 900_000;
const START_EDGE = 2400;
const START_QUALITY = 0.78;
const MIN_EDGE = 320;
const MIN_QUALITY = 0.35;
const QUALITY_STEP = 0.08;
// picker thumb for custom uploads only — preset swatches use next/image on the full JPEG.
const THUMB_EDGE = 96; // 2× the 48px picker swatch (size-12) for retina
const THUMB_QUALITY = 0.75;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const dataUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function encodeJpeg(bitmap: ImageBitmap, width: number, height: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality,
    );
  });
}

function scaledDimensions(bitmap: ImageBitmap, edge: number) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > edge ? edge / longest : 1;
  return {
    width: Math.max(1, Math.round(bitmap.width * scale)),
    height: Math.max(1, Math.round(bitmap.height * scale)),
  };
}

// resize + re-encode until the data: url fits the iframe css custom-property budget.
export async function compressBitmapForIframeCss(bitmap: ImageBitmap) {
  let edge = START_EDGE;
  let quality = START_QUALITY;
  let out!: Blob;
  let dataUrl!: string;

  while (true) {
    const { width, height } = scaledDimensions(bitmap, edge);
    out = await encodeJpeg(bitmap, width, height, quality);
    dataUrl = await blobToDataUrl(out);

    if (dataUrl.length <= CSS_DATA_URL_BUDGET) return { blob: out, dataUrl };

    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      continue;
    }

    if (edge > MIN_EDGE) {
      edge = Math.max(MIN_EDGE, Math.floor(edge * 0.85));
      quality = START_QUALITY;
      continue;
    }

    throw new Error(
      `Background image is too large for iframe CSS (${dataUrl.length} chars, budget ${CSS_DATA_URL_BUDGET})`,
    );
  }
}

export async function compressBlobForIframeCss(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    return await compressBitmapForIframeCss(bitmap);
  } finally {
    bitmap.close();
  }
}

export async function compressBitmapForPickerThumb(bitmap: ImageBitmap, maxEdge = THUMB_EDGE) {
  const { width, height } = scaledDimensions(bitmap, maxEdge);
  return encodeJpeg(bitmap, width, height, THUMB_QUALITY);
}

export async function compressBlobForPickerThumb(blob: Blob, maxEdge = THUMB_EDGE) {
  const bitmap = await createImageBitmap(blob);
  try {
    return compressBitmapForPickerThumb(bitmap, maxEdge);
  } finally {
    bitmap.close();
  }
}

export function getCachedIframeBackgroundImage(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  return dataUrlCache.get(url);
}

// any background image url → compressed data: url for iframe css (cached + deduped).
export async function resolveIframeBackgroundImage(url: string) {
  const cached = getCachedIframeBackgroundImage(url);
  if (cached) return cached;

  const key = url.startsWith("blob:") ? url : new URL(url, window.location.origin).href;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const blob = await fetch(url.startsWith("blob:") ? url : key).then((res) => {
      if (!res.ok) throw new Error(`Could not load background image: ${res.status}`);
      return res.blob();
    });
    const { dataUrl } = await compressBlobForIframeCss(blob);
    dataUrlCache.set(key, dataUrl);
    if (key !== url) dataUrlCache.set(url, dataUrl);
    return dataUrl;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export function revokeBackgroundImageUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    dataUrlCache.delete(url);
    URL.revokeObjectURL(url);
  }
}

export async function prepareCustomBackgroundImage(file: File): Promise<{
  url: string;
  thumbUrl: string;
  iframeDataUrl: string;
}> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const [{ blob, dataUrl }, thumbBlob] = await Promise.all([
      compressBitmapForIframeCss(bitmap),
      compressBitmapForPickerThumb(bitmap),
    ]);
    const url = URL.createObjectURL(blob);
    const thumbUrl = URL.createObjectURL(thumbBlob);
    dataUrlCache.set(url, dataUrl);
    return { url, thumbUrl, iframeDataUrl: dataUrl };
  } finally {
    bitmap.close();
  }
}

export function prewarmPresetBackgroundImages() {
  for (const bg of BACKGROUNDS) {
    if ("image" in bg && bg.image) void resolveIframeBackgroundImage(bg.image);
  }
}
