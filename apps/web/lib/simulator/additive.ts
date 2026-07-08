import type { CSSProperties } from "react";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  backgroundBackdropStyle,
  type BackgroundPreset,
} from "@/lib/simulator/background";

export type AdditiveBackdropGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  // layout size ÷ painted size; <1 when the display is zoomed in on screen.
  displayScale: number;
};

function additiveGeometryKey(geometry: AdditiveBackdropGeometry | undefined): string {
  if (!geometry) return "";
  return `${geometry.left}|${geometry.top}|${geometry.width}|${geometry.height}|${geometry.displayScale}`;
}

const GEOMETRY_PROPS = [
  "--hud-bg-left",
  "--hud-bg-top",
  "--hud-bg-width",
  "--hud-bg-height",
  "--hud-bg-filter",
] as const;

export function measureAdditiveBackdrop(
  stage: HTMLElement | null,
  display: HTMLElement | null,
): AdditiveBackdropGeometry | undefined {
  if (!stage || !display) return undefined;

  const stageRect = stage.getBoundingClientRect();
  const displayRect = display.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height || !displayRect.width || !displayRect.height) {
    return undefined;
  }

  const width = stageRect.width * BACKDROP_SCALE;
  const height = stageRect.height * BACKDROP_SCALE;
  const left = stageRect.left - (width - stageRect.width) / 2;
  const top = stageRect.top - (height - stageRect.height) / 2;
  const displayScale = displayRect.width > 0 ? display.offsetWidth / displayRect.width : 1;
  const scaleX = displayScale;
  const scaleY = displayRect.height > 0 ? display.offsetHeight / displayRect.height : displayScale;

  return {
    left: (left - displayRect.left) * scaleX,
    top: (top - displayRect.top) * scaleY,
    width: width * scaleX,
    height: height * scaleY,
    displayScale,
  };
}

export function additiveSliceStyle(): CSSProperties {
  return {
    position: "absolute",
    left: "var(--hud-bg-left, 0px)",
    top: "var(--hud-bg-top, 0px)",
    width: "var(--hud-bg-width, 100%)",
    height: "var(--hud-bg-height, 100%)",
    pointerEvents: "none",
    zIndex: 0,
  };
}

export function additiveBackdropContentStyle(preset: BackgroundPreset): CSSProperties {
  const style = backgroundBackdropStyle(preset);
  return {
    ...style,
    filter: "var(--hud-bg-filter, none)",
  };
}

export function syncHostAdditive(
  display: HTMLElement | null,
  additive: boolean,
  preset: BackgroundPreset,
  geometry: AdditiveBackdropGeometry | undefined,
  backgroundBrightness: number,
  backgroundBlur: number,
  lastKey?: string,
): string | undefined {
  if (!display) return undefined;

  if (!additive) {
    for (const prop of GEOMETRY_PROPS) display.style.removeProperty(prop);
    return "";
  }

  const blurScale = (preset.image ? BACKDROP_SCALE : 1) * (geometry?.displayScale ?? 1);
  const filter = backgroundBackdropFilter(
    preset,
    backgroundBrightness,
    backgroundBlur,
    blurScale,
  );
  if (!geometry) return lastKey;

  const key = `${additiveGeometryKey(geometry)}|${filter ?? ""}`;
  if (key === lastKey) return key;

  display.style.setProperty("--hud-bg-left", `${geometry.left}px`);
  display.style.setProperty("--hud-bg-top", `${geometry.top}px`);
  display.style.setProperty("--hud-bg-width", `${geometry.width}px`);
  display.style.setProperty("--hud-bg-height", `${geometry.height}px`);

  if (filter) display.style.setProperty("--hud-bg-filter", filter);
  else display.style.removeProperty("--hud-bg-filter");

  return key;
}

// host backdrop is a sibling behind the iframe — only the iframe element can screen-blend with it.
export function clearIframeBodyBlend(iframe: HTMLIFrameElement | null) {
  const doc = iframe?.contentDocument;
  if (!doc?.body) return;

  try {
    doc.body.style.removeProperty("mix-blend-mode");
    doc.body.style.removeProperty("min-height");
    doc.body.style.removeProperty("overflow");
  } catch {
    // cross-origin while scramjet navigates
  }
}

export function settleAdditiveSync(sync: () => void) {
  sync();
  requestAnimationFrame(() => {
    sync();
    requestAnimationFrame(sync);
  });
}

// matches the Meta chrome extension: filter on the app body, not a host overlay.
export function syncDisplayBrightness(iframe: HTMLIFrameElement | null, displayBrightness: number) {
  const doc = iframe?.contentDocument;
  if (!doc?.body) return;

  try {
    if (displayBrightness >= 100) doc.body.style.removeProperty("filter");
    else doc.body.style.filter = `brightness(${displayBrightness / 100})`;
  } catch {
    // The frame can briefly expose a cross-origin WindowProxy while Scramjet navigates.
  }
}
