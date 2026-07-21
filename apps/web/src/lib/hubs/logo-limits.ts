export const ALLOWED_LOGO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedLogoContentType = (typeof ALLOWED_LOGO_CONTENT_TYPES)[number];

export const MAX_LOGO_BYTES = 256 * 1024; // 256 KB

export function isAllowedLogoContentType(
  contentType: string,
): contentType is AllowedLogoContentType {
  return (ALLOWED_LOGO_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function sanitizeLogoFilename(filename: string): string | null {
  const base = filename.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  if (!base || base === "." || base === ".." || base.includes("..")) return null;

  const lastDot = base.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < base.length - 1;
  const stem = hasExt ? base.slice(0, lastDot) : base;
  const ext = hasExt ? base.slice(lastDot + 1) : "";

  const safeStem = stem
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

  if (!safeStem) return null;
  return safeExt ? `${safeStem}.${safeExt}` : safeStem;
}
