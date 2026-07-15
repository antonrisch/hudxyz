/**
 * Normalize a Date for sitemap `lastmod`.
 * Returns undefined when the value is missing, invalid, or outside a plausible
 * calendar range (guards against seconds/milliseconds mapping mistakes).
 */
export function sitemapLastModified(value: Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const time = value.getTime();
  if (!Number.isFinite(time)) return undefined;
  const year = value.getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  // Reject absurd far-future blowups from unit mixups.
  if (time > Date.now() + 1000 * 60 * 60 * 24 * 365) return undefined;
  return value;
}

/** True when an ISO lastmod string looks like a normal four-digit year date. */
export function isPlausibleSitemapLastmod(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-Z]+)?$/.test(iso)) return false;
  return sitemapLastModified(new Date(iso)) != null;
}
