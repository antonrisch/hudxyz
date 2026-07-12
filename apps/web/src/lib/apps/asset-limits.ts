export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

/** Browser-playable H.264 MP4 only — skip MOV/WebM for v1 (no transcoding). */
export const ALLOWED_PREVIEW_CONTENT_TYPES = ["video/mp4"] as const;

export type AllowedPreviewContentType = (typeof ALLOWED_PREVIEW_CONTENT_TYPES)[number];

export const MAX_SCREENSHOTS_PER_APP = 10;
export const MAX_PREVIEWS_PER_APP = 1;

/** Soft caps — enforced when the client reports size/duration/dimensions. */
export const MAX_ICON_BYTES = 256 * 1024; // 256 KB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB (screenshots)
export const MAX_PREVIEW_BYTES = 50 * 1024 * 1024; // 50 MB (Apple allows 500 MB)
export const PREVIEW_DURATION_MIN_MS = 5_000;
export const PREVIEW_DURATION_MAX_MS = 30_000;
/** Prefer 600×600 (MRBD); reject absurd uploads. */
export const PREVIEW_MAX_EDGE_PX = 1920;

export function maxBytesForAssetKind(kind: "icon" | "screenshot" | "video"): number {
  switch (kind) {
    case "icon":
      return MAX_ICON_BYTES;
    case "screenshot":
      return MAX_IMAGE_BYTES;
    case "video":
      return MAX_PREVIEW_BYTES;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isAllowedImageContentType(
  contentType: string,
): contentType is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function isAllowedPreviewContentType(
  contentType: string,
): contentType is AllowedPreviewContentType {
  return (ALLOWED_PREVIEW_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function isAllowedContentTypeForKind(
  kind: "icon" | "screenshot" | "video",
  contentType: string,
): boolean {
  if (kind === "video") return isAllowedPreviewContentType(contentType);
  return isAllowedImageContentType(contentType);
}

export function sanitizeAssetFilename(filename: string): string | null {
  const base = filename.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!base || base.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

export function isValidPreviewDurationMs(durationMs: number): boolean {
  return (
    Number.isFinite(durationMs) &&
    durationMs >= PREVIEW_DURATION_MIN_MS &&
    durationMs <= PREVIEW_DURATION_MAX_MS
  );
}

export function isValidPreviewDimensions(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width < 1 || height < 1) return false;
  return width <= PREVIEW_MAX_EDGE_PX && height <= PREVIEW_MAX_EDGE_PX;
}
