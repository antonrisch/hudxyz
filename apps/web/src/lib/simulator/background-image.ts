// custom background photos are resized client-side and held as blob: urls on the host stage.

import type { CustomBackgroundFailReason } from "@/lib/analytics/events";

const DISPLAY_EDGE = 2400;
const DISPLAY_QUALITY = 0.78;
// custom uploads get a dedicated thumb blob; preset swatches use pre-built thumb webp assets.
const THUMB_EDGE = 96; // 2× the 48px picker swatch (size-12) for retina
const THUMB_QUALITY = 0.75;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class CustomBackgroundError extends Error {
  readonly reason: CustomBackgroundFailReason;

  constructor(reason: CustomBackgroundFailReason, message: string) {
    super(message);
    this.name = "CustomBackgroundError";
    this.reason = reason;
  }
}

export function customBackgroundFailReason(error: unknown): CustomBackgroundFailReason {
  if (error instanceof CustomBackgroundError) return error.reason;
  return "processing";
}

async function encodeJpeg(bitmap: ImageBitmap, width: number, height: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CustomBackgroundError("processing", "Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) =>
        next
          ? resolve(next)
          : reject(new CustomBackgroundError("processing", "Could not compress image")),
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

async function compressBitmapForDisplay(bitmap: ImageBitmap, maxEdge = DISPLAY_EDGE) {
  const { width, height } = scaledDimensions(bitmap, maxEdge);
  return encodeJpeg(bitmap, width, height, DISPLAY_QUALITY);
}

async function compressBitmapForPickerThumb(bitmap: ImageBitmap, maxEdge = THUMB_EDGE) {
  const { width, height } = scaledDimensions(bitmap, maxEdge);
  return encodeJpeg(bitmap, width, height, THUMB_QUALITY);
}

export function revokeBackgroundImageUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export async function prepareCustomBackgroundImage(file: File): Promise<{
  url: string;
  thumbUrl: string;
}> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new CustomBackgroundError(
      "size",
      `Image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new CustomBackgroundError("type", "File must be an image");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new CustomBackgroundError("processing", "Could not decode image");
  }

  try {
    const [displayBlob, thumbBlob] = await Promise.all([
      compressBitmapForDisplay(bitmap),
      compressBitmapForPickerThumb(bitmap),
    ]);
    return {
      url: URL.createObjectURL(displayBlob),
      thumbUrl: URL.createObjectURL(thumbBlob),
    };
  } finally {
    bitmap.close();
  }
}
