import type { CSSProperties } from "react";
import type { Intent, View } from "@/lib/emulator/store";

// device identity shown in the emulator chrome (model + os build). placeholders — set real values.
export const DEVICE_MODEL = "Meta Ray-Ban Display";
export const OS_VERSION = "125.1";

// glasses stage scale; frame + lens slot share the same container so this scales both.
export const FRAMES_SCALE = 1.8;
export const FRAMES_STAGE_UNITS = 240 * FRAMES_SCALE; // tailwind spacing multiplier (was w-240)

// display placement over the right lens, as % of the frames container.
export const RIGHT_LENS = { left: 58.5, top: 44.5, size: 10.5 };

// device render size (matches the glasses surface)
export const VIEWPORT = 600;

// frames svg aspect (viewBox 6476 × 2959); converts the square lens slot's height
// (a % of stage width) into a % of stage height.
export const FRAMES_ASPECT = 6476 / 2959;

// glasses zoom focal point: the right-lens iframe midpoint, as % of the device stage.
// the view is translated to center this point, and zoom scales about it.
export const LENS_CENTER = {
  x: RIGHT_LENS.left + RIGHT_LENS.size / 2,
  y: RIGHT_LENS.top + (RIGHT_LENS.size / 2) * FRAMES_ASPECT,
};

// default 600×600 magnification per chrome view (1 = true pixels).
export const DEFAULT_DEVICE_SCALE = { glasses: 0.67, actual: 1 } as const satisfies Record<
  View,
  number
>;

// cosmetic presentation modes; all wrap the SAME persistent device surface.
// glasses: framed over the lens. 1:1: exact 600×600.
export const VIEWS = [
  { key: "glasses", label: "Glasses" },
  { key: "actual", label: "1:1" },
] as const satisfies ReadonlyArray<{ key: View; label: string }>;

// standardized device surface tint, shared by the surface box, the iframe and the overlays.
export const DEVICE_BG = "bg-muted/10";

// the device surface: clipped, rounded, tinted — consistent across every view (it's what
// shows whenever an app isn't covering it). only the positioning differs, so device.tsx
// composes this base with per-view layout classes.
export const DEVICE_SURFACE = `overflow-hidden rounded-lg ${DEVICE_BG}`;

// glasses: place the surface over the right lens, as % of the framed plane.
export const LENS_SLOT: CSSProperties = {
  left: `${RIGHT_LENS.left}%`,
  top: `${RIGHT_LENS.top}%`,
  width: `${RIGHT_LENS.size}%`,
  aspectRatio: "1 / 1",
};

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

// icons are same-origin (/public) — /emulator sets COEP require-corp, which blocks
// cross-origin images without CORP.
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
