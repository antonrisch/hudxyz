// custom environment photos are resized client-side and held as blob: urls for the host
// canvas. the proxied iframe cannot load blob:/same-origin urls (scramjet aborts them), so
// we read the blob in the parent and inject a compressed data: url into iframe css instead.

// iframe css custom properties top out around 2–4 MB; stay under this string-length budget.
const CSS_DATA_URL_BUDGET = 1_800_000;
const START_EDGE = 3200;
const START_QUALITY = 0.92;
const MIN_EDGE = 1280;
const MIN_QUALITY = 0.72;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const iframeDataUrlCache = new Map<string, string>();

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function encodeJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality,
    );
  });

  return { blob, width, height };
}

export function revokeEnvironmentImageUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    iframeDataUrlCache.delete(url);
    URL.revokeObjectURL(url);
  }
}

export function getCachedIframeEnvironmentImage(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("blob:")) return iframeDataUrlCache.get(url);
  return undefined;
}

// parent-side read of a session blob: url → data: url for iframe css injection.
export async function resolveIframeEnvironmentImage(url: string) {
  const cached = getCachedIframeEnvironmentImage(url);
  if (cached) return cached;
  if (!url.startsWith("blob:")) return url;

  const blob = await fetch(url).then((res) => res.blob());
  const dataUrl = await blobToDataUrl(blob);
  iframeDataUrlCache.set(url, dataUrl);
  return dataUrl;
}

export async function prepareCustomEnvironmentImage(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const bitmap = await createImageBitmap(file);

  let edge = START_EDGE;
  let quality = START_QUALITY;
  let blob!: Blob;
  let dataUrl!: string;

  try {
    while (true) {
      const encoded = await encodeJpeg(bitmap, edge, quality);
      blob = encoded.blob;
      dataUrl = await blobToDataUrl(blob);

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

  const blobUrl = URL.createObjectURL(blob);
  iframeDataUrlCache.set(blobUrl, dataUrl);
  return blobUrl;
}
