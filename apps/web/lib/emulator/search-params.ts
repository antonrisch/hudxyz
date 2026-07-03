import { VIEWS } from "@/lib/emulator/config";
import { isEnvironmentKey, type EnvironmentKey } from "@/lib/emulator/environment";
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
  additive?: number;
  environment?: EnvironmentKey;
  lensTint?: boolean;
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
  const a = p.get("additive");
  if (a != null) {
    const n = Number.parseInt(a, 10);
    if (Number.isFinite(n)) seed.additive = Math.min(100, Math.max(0, n));
  }
  const e = p.get("environment");
  if (e && isEnvironmentKey(e)) seed.environment = e;
  if (p.get("lensTint") === "0") seed.lensTint = false;
  return seed;
}

// mirror a display setting into the query string; the default value keeps the url clean.
export function syncSearchParam(key: string, value: string, defaultValue: string) {
  const p = new URLSearchParams(window.location.search);
  if (value === defaultValue) p.delete(key);
  else p.set(key, value);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}
