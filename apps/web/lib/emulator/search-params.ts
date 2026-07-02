import { VIEWS } from "@/lib/emulator/config";
import type { View } from "@/lib/emulator/store";

export const EMULATOR_SHARE_PATH = "https://hud.xyz/emulator";

export function buildEmulatorShareUrl(appUrl?: string): string {
  if (!appUrl) return EMULATOR_SHARE_PATH;
  return `${EMULATOR_SHARE_PATH}?${new URLSearchParams({ url: appUrl }).toString()}`;
}

export function readEmulatorSearchSeed(): {
  view?: View;
  url?: string;
  loadToken?: number;
  status?: "loading";
} {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const seed: ReturnType<typeof readEmulatorSearchSeed> = {};
  const v = p.get("view");
  if (v && VIEWS.some((x) => x.key === v)) seed.view = v as View;
  const u = p.get("url");
  if (u) {
    seed.url = u;
    seed.loadToken = 1;
    seed.status = "loading";
  }
  return seed;
}

export function syncViewToUrl(view: View) {
  const p = new URLSearchParams(window.location.search);
  if (view === "glasses") p.delete("view");
  else p.set("view", view);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}
