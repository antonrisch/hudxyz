/**
 * Personal chrome prefs — cookie only (SSR-seeded). Not shareable; not in the URL.
 * One-time localStorage → cookie migration for pre-cookie installs.
 */

export type ToolbarPlacementPref = "floaty" | "sidebar";

export const DISPLAY_PANEL_OPEN_COOKIE = "simulator.displayPanelOpen";
export const TOOLBAR_PLACEMENT_COOKIE = "simulator.toolbarPlacement";

const DISPLAY_PANEL_OPEN_KEY = "simulator.displayPanelOpen";
const TOOLBAR_PLACEMENT_KEY = "simulator.toolbarPlacement";
const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function hasCookie(name: string) {
  return typeof document !== "undefined" && document.cookie.includes(`${name}=`);
}

export function parseDisplayPanelOpenCookie(value: string | undefined): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return true;
}

export function parseToolbarPlacementCookie(value: string | undefined): ToolbarPlacementPref {
  if (value === "floaty" || value === "sidebar") return value;
  return "floaty";
}

export function writeDisplayPanelOpen(open: boolean) {
  writeCookie(DISPLAY_PANEL_OPEN_COOKIE, String(open));
}

export function writeToolbarPlacement(placement: ToolbarPlacementPref) {
  writeCookie(TOOLBAR_PLACEMENT_COOKIE, placement);
}

function readLegacyDisplayPanelOpen(): boolean {
  try {
    const stored = localStorage.getItem(DISPLAY_PANEL_OPEN_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function readLegacyToolbarPlacement(): ToolbarPlacementPref {
  try {
    const stored = localStorage.getItem(TOOLBAR_PLACEMENT_KEY);
    if (stored === "floaty" || stored === "sidebar") return stored;
    return "floaty";
  } catch {
    return "floaty";
  }
}

type PrefStore = {
  getState: () => {
    displayPanelOpen: boolean;
    toolbarPlacement: ToolbarPlacementPref;
    setDisplayPanelOpen: (open: boolean, persist?: boolean) => void;
    setToolbarPlacement: (placement: ToolbarPlacementPref, persist?: boolean) => void;
  };
};

/** One-time localStorage → cookie migration for prefs that predate SSR seeding. */
export function migrateLegacySimulatorPreferences(store: PrefStore) {
  if (typeof document === "undefined") return;

  if (!hasCookie(TOOLBAR_PLACEMENT_COOKIE)) {
    const legacy = readLegacyToolbarPlacement();
    if (legacy !== store.getState().toolbarPlacement) {
      store.getState().setToolbarPlacement(legacy);
    }
  }

  if (!hasCookie(DISPLAY_PANEL_OPEN_COOKIE)) {
    const legacyOpen = readLegacyDisplayPanelOpen();
    if (legacyOpen !== store.getState().displayPanelOpen) {
      store.getState().setDisplayPanelOpen(legacyOpen);
    }
  }
}
