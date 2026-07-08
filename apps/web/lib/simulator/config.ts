import type { Intent, View } from "@/lib/simulator/store";

// device identity shown in the simulator chrome (model + os build). placeholders — set real values.
export const DEVICE_MODEL = "Meta Ray-Ban Display";
export const SIMULATOR_TITLE = "Meta Ray-Ban Display Simulator";
// sidebar footer, layout fallback, mobile drawer sr-only.
export const SIMULATOR_SUMMARY =
  "Test Meta Ray-Ban Display web apps in your browser — 600×600 viewport, D-pad input, additive blending, screenshots and screen recording, no glasses required.";
// page meta, OG/Twitter, JSON-LD, manifest.
export const SIMULATOR_TAGLINE =
  "Meta Ray-Ban Display simulator for web app developers. Test MRBD apps at 600×600 with D-pad navigation, screenshots, and screen recording — no device required.";
export const OS_VERSION = "125.1";

export const RIGHT_LENS = { left: 58.5, top: 44.5, size: 10.5 };

// device render size (matches the glasses surface)
export const VIEWPORT = 600;

// frames svg aspect (viewBox 6476 × 2959); converts the square lens slot's height
// (a % of stage width) into a % of stage height.
export const FRAMES_ASPECT = 6476 / 2959;

// glasses chrome is decorative: size it around the fixed 600×600 display.
const GLASSES_STAGE = {
  width: VIEWPORT / (RIGHT_LENS.size / 100),
  height: VIEWPORT / (RIGHT_LENS.size / 100) / FRAMES_ASPECT,
};

// the frames svg positioned relative to the 600×600 display (the content plane), so its
// right-lens slot lands exactly on the display. the display renders identically to 1:1
// mode — the chrome hangs off it, not the other way around.
export const GLASSES_CHROME = {
  left: -(RIGHT_LENS.left / 100) * GLASSES_STAGE.width,
  top: -(RIGHT_LENS.top / 100) * GLASSES_STAGE.height,
  width: GLASSES_STAGE.width,
  height: GLASSES_STAGE.height,
};

// default 600×600 magnification per chrome view (1 = true pixels).
export const DEFAULT_DEVICE_SCALE = { glasses: 0.6, pixel: 1 } as const satisfies Record<
  View,
  number
>;

export const MOBILE_DEFAULT_DEVICE_SCALE = { glasses: 0.35 } as const satisfies Pick<
  Record<View, number>,
  "glasses"
>;

export function desktopDeviceScale(view: View): number {
  return DEFAULT_DEVICE_SCALE[view];
}

export function mobileGlassesDeviceScale(): number {
  return MOBILE_DEFAULT_DEVICE_SCALE.glasses;
}

// cosmetic presentation modes (?mode= in url); all wrap the SAME persistent device surface.
// glasses: framed over the lens. pixel (label 1:1): exact 600×600.
export const VIEWS = [
  { key: "glasses", label: "Glasses" },
  { key: "pixel", label: "1:1" },
] as const satisfies ReadonlyArray<{ key: View; label: string }>;

// standardized device overlay chrome for welcome/loading states on the waveguide surface.
export const DEVICE_OVERLAY = "bg-muted/20";
export const DEVICE_OVERLAY_TEXT = "text-4xl font-medium leading-snug text-white/90";

// the device surface: clipped, rounded, black — consistent across every view (it's what
// shows whenever an app isn't covering it). only the positioning differs, so device.tsx
// composes this base with per-view layout classes.
export const DEVICE_SURFACE = "overflow-hidden rounded-3xl bg-black";

// physical keys the glasses emit, mapped to device intents (window keydown -> intent).
export const INTENT_BY_KEY: Record<string, Intent> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "select",
  Escape: "back",
};

export type SuggestedApp = {
  name: string;
  url: string;
  iconUrl: string;
};

// icons are same-origin (/public) — the simulator route sets COEP require-corp, which blocks
// cross-origin images without CORP.
export const FEEDBACK_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("hud.xyz simulator feedback")}`;
export const DIRECTORY_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("hud.xyz app directory request")}`;

export const SUGGESTED_APPS = [
  {
    name: "Snake game",
    url: "https://hud.xyz/apps/snake",
    iconUrl: "/icon.svg",
  },
  {
    name: "Block Stack",
    url: "https://ikkou.jp/MRBD/apps/block-stack/",
    iconUrl: "/suggested-apps/block-stack.png",
  },
  {
    name: "Alpha Tab",
    url: "https://argustab.awfullynice.app",
    iconUrl: "/suggested-apps/alpha-tab.png",
  },
  {
    name: "Utility Tools",
    url: "https://herald.ascents.gg/a/tools/",
    iconUrl: "/suggested-apps/tools.svg",
  },
  {
    name: "Texas Holdem Poker",
    url: "https://displayholdem.onrender.com",
    iconUrl: "/suggested-apps/texas-holdem.png",
  },
] as const satisfies ReadonlyArray<SuggestedApp>;

// reverse: the key we inject into the proxied app for each intent (app mode).
export const KEY_BY_INTENT: Record<Intent, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  select: "Enter",
  back: "Escape",
};
