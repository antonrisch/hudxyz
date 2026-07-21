const CATALOG_LOAD_KEY = "hud:analytics:catalog-load";
const CATALOG_LOAD_TTL_MS = 30_000;

export type CatalogSimulatorLoadContext = {
  publicId: string;
  timestamp: number;
};

/** Result of consuming a verified directory Try marker. */
export type CatalogLoadResult = {
  publicId: string;
};

function isFreshTimestamp(timestamp: number, now = Date.now()): boolean {
  if (!Number.isFinite(timestamp)) return false;
  const age = now - timestamp;
  // Reject future-dated and expired markers.
  return age >= 0 && age <= CATALOG_LOAD_TTL_MS;
}

/**
 * Mark the next simulator navigation as directory-sourced (`source: "catalog"`).
 * Owned by hub directory Try — call before navigating to `/simulator?url=…`.
 * Uses sessionStorage so analytics state never lands in the share URL.
 */
export function markNextSimulatorLoadAsCatalog(publicId: string): void {
  const trimmed = publicId.trim();
  if (!trimmed) return;
  try {
    const payload: CatalogSimulatorLoadContext = {
      publicId: trimmed,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CATALOG_LOAD_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable; source will fall back to custom.
  }
}

/**
 * Consume a recent directory CTA marker exactly once.
 * Returns `{ publicId }` only for current, verified markers within TTL.
 * Legacy timestamp-only markers are discarded (no catalog without publicId).
 */
export function consumeCatalogSimulatorLoad(): CatalogLoadResult | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_LOAD_KEY);
    sessionStorage.removeItem(CATALOG_LOAD_KEY);
    if (!raw) return null;

    // Legacy timestamp-only markers cannot verify a hub — treat as absent.
    if (/^\d+$/.test(raw)) return null;

    const parsed = JSON.parse(raw) as Partial<CatalogSimulatorLoadContext>;
    if (typeof parsed.publicId !== "string" || typeof parsed.timestamp !== "number") {
      return null;
    }
    const publicId = parsed.publicId.trim();
    if (!publicId || !isFreshTimestamp(parsed.timestamp)) return null;
    return { publicId };
  } catch {
    return null;
  }
}
