const CATALOG_LOAD_KEY = "hud:analytics:catalog-load";
const CATALOG_LOAD_TTL_MS = 30_000;

/**
 * Mark the next simulator navigation as directory-sourced (`source: "catalog"`).
 * Owned by hub directory Try — call before navigating to `/simulator?url=…`.
 * Uses sessionStorage so analytics state never lands in the share URL.
 */
export function markNextSimulatorLoadAsCatalog(): void {
  try {
    sessionStorage.setItem(CATALOG_LOAD_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable; source will fall back to custom.
  }
}

/** Consume a recent directory CTA marker exactly once. */
export function consumeCatalogSimulatorLoad(): boolean {
  try {
    const raw = sessionStorage.getItem(CATALOG_LOAD_KEY);
    sessionStorage.removeItem(CATALOG_LOAD_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= CATALOG_LOAD_TTL_MS;
  } catch {
    return false;
  }
}
