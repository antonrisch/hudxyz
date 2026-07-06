import {
  additiveEnvBg,
  additiveEnvFilter,
  type EnvironmentPreset,
} from "@/lib/emulator/environment";

const STYLE_ID = "hud-additive-style";
const ACTIVE_CLASS = "hud-additive";
const LENS_TINT_CLASS = "hud-lens-tint";
const BACKDROP_SCALE = 1.1;

type AdditiveBackdropGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  // layout size ÷ painted size; <1 when the display is zoomed in on screen.
  displayScale: number;
};

const SHEET = `
html.${ACTIVE_CLASS} {
  min-height: 100%;
  background: var(--env-fill, #1e293b);
}

html.${ACTIVE_CLASS}::before {
  content: "";
  position: fixed;
  left: var(--hud-env-left, 0px);
  top: var(--hud-env-top, 0px);
  width: var(--hud-env-width, 100vw);
  height: var(--hud-env-height, 100vh);
  z-index: 0;
  pointer-events: none;
  background-color: var(--env-fill, #1e293b);
  background-image: var(--env-bg, none);
  background-size: var(--env-bg-size, cover);
  background-position: center;
  filter: var(--env-filter, none);
}

html.${ACTIVE_CLASS}.${LENS_TINT_CLASS}::after {
  content: "";
  position: fixed;
  left: var(--hud-env-left, 0px);
  top: var(--hud-env-top, 0px);
  width: var(--hud-env-width, 100vw);
  height: var(--hud-env-height, 100vh);
  z-index: 0;
  pointer-events: none;
  background: var(--lens-tint);
}

html.${ACTIVE_CLASS} body {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  mix-blend-mode: screen !important;
}
`;

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
  const displayScale =
    displayRect.width > 0 ? display.offsetWidth / displayRect.width : 1;
  const scaleX = displayScale;
  const scaleY =
    displayRect.height > 0 ? display.offsetHeight / displayRect.height : displayScale;

  return {
    left: (left - displayRect.left) * scaleX,
    top: (top - displayRect.top) * scaleY,
    width: width * scaleX,
    height: height * scaleY,
    displayScale,
  };
}

export function syncAdditive(
  iframe: HTMLIFrameElement | null,
  additive: boolean,
  environment: EnvironmentPreset,
  image?: string,
  geometry?: AdditiveBackdropGeometry,
  lensTint = false,
  backgroundBrightness = 80,
  backgroundBlur = 0,
) {
  const doc = iframe?.contentDocument;
  if (!doc?.documentElement) return;

  try {
    const root = doc.documentElement;

    if (!additive) {
      root.classList.remove(ACTIVE_CLASS);
      root.classList.remove(LENS_TINT_CLASS);
      doc.getElementById(STYLE_ID)?.remove();
      return;
    }

    const style = doc.getElementById(STYLE_ID) ?? doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = SHEET;
    doc.head.append(style);

    const host = getComputedStyle(document.documentElement);

    root.classList.add(ACTIVE_CLASS);
    root.classList.toggle(LENS_TINT_CLASS, lensTint);
    root.style.setProperty("--env-fill", host.getPropertyValue("--env-fill").trim() || "#1e293b");
    root.style.setProperty("--lens-tint", host.getPropertyValue("--lens-tint").trim());
    root.style.setProperty("--env-bg", additiveEnvBg(environment, image));
    root.style.setProperty("--env-bg-size", environment.image ? "cover" : "auto");
    const canvasBlurScale = environment.image ? BACKDROP_SCALE : 1;
    const blurScale = canvasBlurScale * (geometry?.displayScale ?? 1);
    root.style.setProperty(
      "--env-filter",
      additiveEnvFilter(environment, backgroundBrightness, backgroundBlur, blurScale),
    );
    root.style.setProperty("--hud-env-left", `${geometry?.left ?? 0}px`);
    root.style.setProperty("--hud-env-top", `${geometry?.top ?? 0}px`);
    root.style.setProperty("--hud-env-width", `${geometry?.width ?? 600}px`);
    root.style.setProperty("--hud-env-height", `${geometry?.height ?? 600}px`);
  } catch {
    // The frame can briefly expose a cross-origin WindowProxy while Scramjet navigates.
  }
}

// matches the Meta chrome extension: filter on the app body, not a host overlay.
export function syncDisplayBrightness(
  iframe: HTMLIFrameElement | null,
  displayBrightness: number,
) {
  const doc = iframe?.contentDocument;
  if (!doc?.body) return;

  try {
    if (displayBrightness >= 100) doc.body.style.removeProperty("filter");
    else doc.body.style.filter = `brightness(${displayBrightness / 100})`;
  } catch {
    // The frame can briefly expose a cross-origin WindowProxy while Scramjet navigates.
  }
}
