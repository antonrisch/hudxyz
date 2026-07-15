/** Prefer https:// when `author` is a bare hostname; leave full URLs alone. */
export function authorHref(author: string): string | null {
  const trimmed = author.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

function authorHostname(author: string): string | null {
  const trimmed = author.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Byline label: `https://example.com/` */
export function authorSiteLabel(author: string): string | null {
  const hostname = authorHostname(author);
  return hostname ? `https://${hostname}/` : null;
}

/** Link target for byline; falls back to https:// for any non-empty author. */
export function authorSiteHref(author: string): string | null {
  const hostname = authorHostname(author);
  if (!hostname) return null;
  return authorHref(author) ?? `https://${hostname}`;
}

export function formatOpenCount(count: number): string {
  const formatted = count.toLocaleString();
  return count === 1 ? `${formatted} open` : `${formatted} opens`;
}

/** Glasses launches + simulator tries. */
export function totalOpenCount(listing: { launchCount: number; simCount: number }): number {
  return listing.launchCount + listing.simCount;
}
