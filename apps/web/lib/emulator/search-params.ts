import {
  createLoader,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { VIEWS } from "@/lib/emulator/config";
import { DEFAULT_BACKGROUND, BACKGROUNDS } from "@/lib/emulator/background";
import type { Seed, View } from "@/lib/emulator/store";

export const EMULATOR_SHARE_PATH = "https://hud.xyz/emulator";

export function buildEmulatorShareUrl(appUrl?: string): string {
  if (!appUrl) return EMULATOR_SHARE_PATH;
  return `${EMULATOR_SHARE_PATH}?${new URLSearchParams({ url: appUrl }).toString()}`;
}

const VIEW_KEYS = VIEWS.map((v) => v.key);
const BACKGROUND_KEYS = BACKGROUNDS.map((bg) => bg.key);

// url <-> emulator state contract. these parsers are the single source of truth for both
// the initial (server-parsed) seed and the client-side writes, so ssr and hydration agree.
// nuqs clears a param when it equals its default, keeping shared urls clean.
export const emulatorParsers = {
  mode: parseAsStringLiteral(VIEW_KEYS).withDefault("glasses" satisfies View),
  url: parseAsString.withDefault(""),
  additive: parseAsBoolean.withDefault(true),
  bg: parseAsStringLiteral(BACKGROUND_KEYS).withDefault(DEFAULT_BACKGROUND),
  lensTint: parseAsBoolean.withDefault(false),
  bgBrightness: parseAsInteger.withDefault(80),
  bgBlur: parseAsInteger.withDefault(0),
  displayBrightness: parseAsInteger.withDefault(100),
};

// server-side reader: parse Next's searchParams (a promise in app router) into typed values.
export const loadEmulatorSearchParams = createLoader(emulatorParsers);

// turn parsed url params into the store's initial state. a deep-linked ?url= arms a load.
export function seedFromParams(params: {
  mode: View;
  url: string;
  additive: boolean;
  bg: (typeof BACKGROUND_KEYS)[number];
  lensTint: boolean;
  bgBrightness: number;
  bgBlur: number;
  displayBrightness: number;
}): Seed {
  const seed: Seed = {
    view: params.mode,
    additive: params.additive,
    // custom uploads are session-only; a refreshed ?bg=custom has no image to show.
    background: params.bg === "custom" ? DEFAULT_BACKGROUND : params.bg,
    lensTint: params.lensTint,
    backgroundBrightness: params.bgBrightness,
    backgroundBlur: params.bgBlur,
    displayBrightness: params.displayBrightness,
  };
  if (params.url) {
    seed.url = params.url;
    seed.loadToken = 1;
    seed.status = "loading";
  }
  return seed;
}
