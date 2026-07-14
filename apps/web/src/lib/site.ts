/** Canonical site origin for sitemap, robots, and JSON-LD. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://hudxyz.com";
}

export function absoluteUrl(path: string): string {
  const base = siteUrl().replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
