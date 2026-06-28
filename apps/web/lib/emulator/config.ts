import type { CSSProperties } from "react";
import type { Intent, View } from "@/lib/emulator/store";

// display placement over the right lens, as % of the frames container.
export const RIGHT_LENS = { left: 63.75, top: 28, size: 17 };

// device render size (matches the glasses surface)
export const VIEWPORT = 600;

// frames svg aspect (viewBox 3696 × 1120.52); converts the square lens slot's height
// (a % of stage width) into a % of stage height.
export const FRAMES_ASPECT = 3696 / 1120.52;

// glasses zoom focal point: the right-lens iframe midpoint, as % of the device stage.
// the view is translated to center this point, and zoom scales about it.
export const LENS_CENTER = {
  x: RIGHT_LENS.left + RIGHT_LENS.size / 2,
  y: RIGHT_LENS.top + (RIGHT_LENS.size / 2) * FRAMES_ASPECT,
};

// cosmetic presentation modes; all wrap the SAME persistent device surface.
// glasses: framed over the lens. fit: scaled to fill the area. 1:1: exact 600×600.
export const VIEWS = [
  { key: "glasses", label: "Glasses" },
  { key: "fit", label: "Fit" },
  { key: "actual", label: "1:1" },
] as const satisfies ReadonlyArray<{ key: View; label: string }>;

// per-view chrome around the device slot. only className/style change between views,
// so the iframe it wraps stays the same element (no proxy reload).
export const SLOT: Record<View, { className: string; style?: CSSProperties }> = {
  glasses: {
    className: "absolute overflow-hidden",
    style: {
      left: `${RIGHT_LENS.left}%`,
      top: `${RIGHT_LENS.top}%`,
      width: `${RIGHT_LENS.size}%`,
      aspectRatio: "1 / 1",
      borderRadius: 6,
    },
  },
  fit: {
    // fills the leftover space (see #hud-device flex-1); square, capped to width
    className: "h-full aspect-square max-w-full overflow-hidden border border-border bg-black",
  },
  actual: {
    className: "relative mx-auto size-150 overflow-hidden border border-border bg-black",
  },
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

// reverse: the key we inject into the proxied app for each intent (app mode).
export const KEY_BY_INTENT: Record<Intent, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  select: "Enter",
  back: "Escape",
};
