/**
 * Imperative display filters — CSS vars / host iframe style.
 * Slider ticks update Zustand; this applies pixels without re-rendering the stage tree.
 */

import {
  BACKDROP_SCALE,
  backdropUsesOverscale,
  backgroundBackdropFilter,
  type BackgroundPreset,
} from "@/lib/simulator/background";

const BG_FILTER_VAR = "--hud-bg-filter";

export type DisplayFilterTargets = {
  stage: HTMLElement | null;
  display: HTMLElement | null;
  iframe: HTMLIFrameElement | null;
};

export function applyBackgroundFilter(
  targets: Pick<DisplayFilterTargets, "stage" | "display">,
  preset: BackgroundPreset,
  backgroundBrightness: number,
  backgroundBlur: number,
  /** Additive blur scales with display zoom; stage backdrop uses 1. */
  blurScale = 1,
) {
  const filter = backgroundBackdropFilter(
    preset,
    backgroundBrightness,
    backgroundBlur,
    blurScale,
  );

  const backdrop = targets.stage?.querySelector<HTMLElement>('[data-capture="backdrop"]');
  if (backdrop) {
    if (filter) backdrop.style.setProperty(BG_FILTER_VAR, filter);
    else backdrop.style.removeProperty(BG_FILTER_VAR);
  }

  if (targets.display) {
    if (filter) targets.display.style.setProperty(BG_FILTER_VAR, filter);
    else targets.display.style.removeProperty(BG_FILTER_VAR);
  }
}

/** Host-owned: filter the iframe element (no contentDocument writes). */
export function applyDisplayBrightness(
  iframe: HTMLIFrameElement | null,
  displayBrightness: number,
) {
  if (!iframe) return;
  if (displayBrightness >= 100) iframe.style.removeProperty("filter");
  else iframe.style.filter = `brightness(${displayBrightness / 100})`;
}

export function applyDisplayFilters(
  targets: DisplayFilterTargets,
  opts: {
    additive: boolean;
    preset: BackgroundPreset;
    backgroundBrightness: number;
    backgroundBlur: number;
    displayBrightness: number;
    /** From additive geometry; defaults to 1. */
    displayScale?: number;
  },
) {
  const blurScale =
    (backdropUsesOverscale(opts.preset) ? BACKDROP_SCALE : 1) *
    (opts.additive ? (opts.displayScale ?? 1) : 1);

  applyBackgroundFilter(
    targets,
    opts.preset,
    opts.backgroundBrightness,
    opts.backgroundBlur,
    blurScale,
  );
  applyDisplayBrightness(targets.iframe, opts.displayBrightness);
}
