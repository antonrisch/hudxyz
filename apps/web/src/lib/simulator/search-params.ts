import { createLoader, parseAsBoolean, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { VIEWS } from "@/lib/simulator/config";
import { DEFAULT_BACKGROUND, BACKGROUNDS } from "@/lib/simulator/background";
import type { Seed, View } from "@/lib/simulator/store";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hudxyz.com";
export const SIMULATOR_SHARE_PATH = `${siteOrigin}/simulator`;

export function buildSimulatorShareUrl(appUrl?: string, appName?: string): string {
  const params = new URLSearchParams();
  if (appUrl) params.set("url", appUrl);
  const trimmedName = appName?.trim();
  if (trimmedName) params.set("name", trimmedName);
  const query = params.toString();
  if (!query) return SIMULATOR_SHARE_PATH;
  return `${SIMULATOR_SHARE_PATH}?${query}`;
}

// meta ai app deep link for adding a web app to display glasses (scan qr or paste link).
// https://github.com/facebookincubator/meta-wearables-webapp/blob/main/AGENTS.md#2-generate-qr-code-for-easy-device-setup
export function buildDeviceSetupDeepLink(appName: string, appUrl: string): string | null {
  const trimmedName = appName.trim();
  const href = normalizeWebUrl(appUrl);
  if (!trimmedName || !href) return null;
  const params = new URLSearchParams({ appName: trimmedName, appUrl: href });
  return `fb-viewapp://web_app_deep_link?${params.toString()}`;
}

const VIEW_KEYS = VIEWS.map((v) => v.key);
const BACKGROUND_KEYS = BACKGROUNDS.map((bg) => bg.key);

/**
 * Shareable URL ↔ seed contract (nuqs).
 * Keep: url, mode, bg, additive.
 * Do NOT put sliders or chrome prefs here — see apps/web/AGENTS.md (state ownership).
 */
export const simulatorParsers = {
  mode: parseAsStringLiteral(VIEW_KEYS).withDefault("glasses" satisfies View),
  url: parseAsString.withDefault(""),
  additive: parseAsBoolean.withDefault(true),
  bg: parseAsStringLiteral(BACKGROUND_KEYS).withDefault(DEFAULT_BACKGROUND),
};

export const loadSimulatorSearchParams = createLoader(simulatorParsers);

export function seedFromParams(params: {
  mode: View;
  url: string;
  additive: boolean;
  bg: (typeof BACKGROUND_KEYS)[number];
}): Seed {
  const seed: Seed = {
    view: params.mode,
    additive: params.additive,
    // custom uploads are session-only; a refreshed ?bg=custom has no image to show.
    background: params.bg === "custom" ? DEFAULT_BACKGROUND : params.bg,
  };
  if (params.url) {
    seed.url = params.url;
    seed.loadToken = 1;
    seed.status = "loading";
  }
  return seed;
}

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WEBSITE_HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

// parse address-bar input into an http(s) href; prepends https:// when no scheme is given.
export function normalizeWebUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed)
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!WEB_PROTOCOLS.has(url.protocol)) return null;
    if (!WEBSITE_HOSTNAME.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
