// custom environment photos are resized client-side and held as blob: urls for the host
// canvas. the proxied iframe cannot load blob:/same-origin urls (scramjet aborts them), so
// we read the blob in the parent and inject a compressed data: url into iframe css instead.

const CSS_DATA_URL_BUDGET = 1_800_000;
const START_EDGE = 3200;
const START_QUALITY = 0.92;
const MIN_EDGE = 1280;
const MIN_QUALITY = 0.72;
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

// resize + re-encode until the data: url fits the iframe css custom-property budget.
export async function compressBlobForIframeCss(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  let edge = START_EDGE;
  let quality = START_QUALITY;
  let out!: Blob;
  let dataUrl!: string;

  try {
    while (true) {
      const longest = Math.max(bitmap.width, bitmap.height);
      const scale = longest > edge ? edge / longest : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process image");
      ctx.drawImage(bitmap, 0, 0, width, height);

      out = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (next) => (next ? resolve(next) : reject(new Error("Could not compress image"))),
          "image/jpeg",
          quality,
        );
      });
      dataUrl = await blobToDataUrl(out);

      if (dataUrl.length <= CSS_DATA_URL_BUDGET) break;

      if (quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.07);
        continue;
      }

      if (edge > MIN_EDGE) {
        edge = Math.max(MIN_EDGE, Math.floor(edge * 0.85));
        quality = START_QUALITY;
        continue;
      }

      break;
    }
  } finally {
    bitmap.close();
  }

  return { blob: out, dataUrl };
}

export function getCachedIframeEnvironmentImage(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  return dataUrlCache.get(url);
}

// any environment image url → compressed data: url for iframe css (cached + deduped).
export async function resolveIframeEnvironmentImage(url: string) {
  const cached = getCachedIframeEnvironmentImage(url);
  if (cached) return cached;

  const key = url.startsWith("blob:") ? url : new URL(url, window.location.origin).href;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const blob = await fetch(url.startsWith("blob:") ? url : key).then((res) => {
      if (!res.ok) throw new Error(`Could not load environment image: ${res.status}`);
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

export function revokeEnvironmentImageUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    dataUrlCache.delete(url);
    URL.revokeObjectURL(url);
  }
}

export async function prepareCustomEnvironmentImage(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const { blob, dataUrl } = await compressBlobForIframeCss(file);
  const blobUrl = URL.createObjectURL(blob);
  dataUrlCache.set(blobUrl, dataUrl);
  return blobUrl;
}
