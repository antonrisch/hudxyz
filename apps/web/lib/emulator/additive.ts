import {
  environmentBackdropFilter,
  type EnvironmentPreset,
} from "@/lib/emulator/environment";

const STYLE_ID = "hud-additive-style";
const ACTIVE_CLASS = "hud-additive";
const imageCache = new Map<string, Promise<string>>();
const BACKDROP_SCALE = 1.1;

type AdditiveBackdropGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const SHEET = `
html.${ACTIVE_CLASS} {
  min-height: 100%;
  background: var(--hud-env-color, #000);
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
  background-color: var(--hud-env-color, #000);
  background-image: var(--hud-env-image, none);
  background-size: cover;
  background-position: center;
  filter: var(--hud-env-filter, none);
  opacity: var(--hud-env-opacity, 1);
}

html.${ACTIVE_CLASS} body {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  mix-blend-mode: screen !important;
}
`;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

export async function resolveEnvironmentImage(environment: EnvironmentPreset) {
  if (!environment.image) return undefined;
  if (environment.image.startsWith("data:")) return environment.image;

  const url = new URL(environment.image, window.location.origin).href;
  if (imageCache.has(url)) return imageCache.get(url);

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load environment image: ${res.status}`);
      return res.blob();
    })
    .then(blobToDataUrl);

  imageCache.set(url, promise);
  return promise;
}

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
  const scaleX = display.offsetWidth / displayRect.width;
  const scaleY = display.offsetHeight / displayRect.height;

  return {
    left: (left - displayRect.left) * scaleX,
    top: (top - displayRect.top) * scaleY,
    width: width * scaleX,
    height: height * scaleY,
  };
}

export function syncAdditive(
  iframe: HTMLIFrameElement | null,
  display: HTMLElement | null,
  additive: number,
  environment: EnvironmentPreset,
  image?: string,
  geometry?: AdditiveBackdropGeometry,
) {
  const doc = iframe?.contentDocument;

  if (doc?.documentElement) {
    try {
      const root = doc.documentElement;

      if (additive <= 0) {
        root.classList.remove(ACTIVE_CLASS);
        doc.getElementById(STYLE_ID)?.remove();
      } else {
        const style = doc.getElementById(STYLE_ID) ?? doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = SHEET;
        doc.head.append(style);

        const opacity = String(Math.min(100, Math.max(0, additive)) / 100);
        root.classList.add(ACTIVE_CLASS);
        writeAdditiveVars(root, opacity, environment, image, geometry);
      }
    } catch {
      // The frame can briefly expose a cross-origin WindowProxy while Scramjet navigates.
    }
  }

  syncAdditiveUnderlay(display, additive, environment, image, geometry);
}

function syncAdditiveUnderlay(
  display: HTMLElement | null,
  additive: number,
  environment: EnvironmentPreset,
  image?: string,
  geometry?: AdditiveBackdropGeometry,
) {
  if (!display) return;

  if (additive <= 0) {
    clearAdditiveVars(display);
    return;
  }

  const opacity = String(Math.min(100, Math.max(0, additive)) / 100);
  writeAdditiveVars(display, opacity, environment, image, geometry);
}

function writeAdditiveVars(
  element: HTMLElement,
  opacity: string,
  environment: EnvironmentPreset,
  image?: string,
  geometry?: AdditiveBackdropGeometry,
) {
  element.style.setProperty("--hud-env-color", environment.color);
  element.style.setProperty("--hud-env-image", image ? `url("${image}")` : "none");
  element.style.setProperty("--hud-env-filter", environmentBackdropFilter(environment) ?? "none");
  element.style.setProperty("--hud-env-opacity", opacity);
  element.style.setProperty("--hud-env-left", `${geometry?.left ?? 0}px`);
  element.style.setProperty("--hud-env-top", `${geometry?.top ?? 0}px`);
  element.style.setProperty("--hud-env-width", `${geometry?.width ?? 600}px`);
  element.style.setProperty("--hud-env-height", `${geometry?.height ?? 600}px`);
}

function clearAdditiveVars(element: HTMLElement) {
  for (const name of [
    "--hud-env-color",
    "--hud-env-image",
    "--hud-env-filter",
    "--hud-env-opacity",
    "--hud-env-left",
    "--hud-env-top",
    "--hud-env-width",
    "--hud-env-height",
  ]) {
    element.style.removeProperty(name);
  }
}
