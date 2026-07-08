import { createStore } from "zustand/vanilla";
import {
  DEFAULT_BACKGROUND,
  type CustomBackgroundImage,
  type BackgroundKey,
} from "@/lib/simulator/background";

const DISPLAY_PANEL_OPEN_KEY = "simulator.displayPanelOpen";

function readDisplayPanelOpen(): boolean {
  try {
    const stored = localStorage.getItem(DISPLAY_PANEL_OPEN_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

// client-only; call after hydration to sync persisted panel state.
export function getPersistedDisplayPanelOpen(): boolean {
  return readDisplayPanelOpen();
}

function writeDisplayPanelOpen(open: boolean) {
  try {
    localStorage.setItem(DISPLAY_PANEL_OPEN_KEY, String(open));
  } catch {
    // storage unavailable (private browsing, etc.)
  }
}

// headless simulator core: a DOM-free state machine. all side effects (proxy, iframe,
// history, pan/zoom) live in the shell hooks that subscribe to this store, so the core
// stays unit-testable in node and liftable into a package later. (pan/zoom needs DOM
// measurement, so it lives in usePanZoom, not here.)

// what the device screen shows. app: the running proxied app (keys inject here). settings:
// a blurred control overlay over the app. home / apps: baby-os screens (stubs for now).
export type Screen = "app" | "settings" | "home" | "apps";
export type Status = "idle" | "loading" | "revealing" | "ready" | "error"; // app load lifecycle
export type View = "glasses" | "pixel"; // host chrome around the device (?mode= in url)
export type Intent = "up" | "down" | "left" | "right" | "select" | "back"; // d-pad gestures

export interface SimulatorState {
  screen: Screen;
  view: View;
  url: string; // address-bar text / current app url
  status: Status;
  loadToken: number; // bump to (re)trigger a navigation; lets reload re-fire on the same url
  additive: boolean; // off = flat dev preview, on = full waveguide (black reads transparent)
  background: BackgroundKey; // world behind the waveguide (decoupled from canvas chrome)
  customBackgroundImages: CustomBackgroundImage[]; // session uploads (cleared on refresh)
  activeCustomBackgroundId: string | null;
  lensTint: boolean; // cosmetic G-15 tint on svg lenses + additive bg layer
  backgroundBrightness: number; // 0–100, 100 = full (absolute brightness filter)
  backgroundBlur: number; // 0–100 gaussian blur on the stage backdrop
  displayBrightness: number; // 0–100, 100 = full visibility (extension semantics)
  displayPanelOpen: boolean; // rhs display panel (persisted in localStorage on sm+)

  setScreen: (screen: Screen) => void;
  setView: (view: View) => void;
  setUrl: (url: string) => void;
  setAdditive: (additive: boolean) => void;
  setBackground: (background: BackgroundKey) => void;
  addCustomBackground: (url: string, thumbUrl: string) => void;
  selectCustomBackground: (id: string) => void;
  removeCustomBackground: (id: string) => void;
  setLensTint: (lensTint: boolean) => void;
  setBackgroundBrightness: (value: number) => void;
  setBackgroundBlur: (value: number) => void;
  setDisplayBrightness: (value: number) => void;
  setDisplayPanelOpen: (open: boolean) => void;
  toggleDisplayPanel: () => void;
  requestLoad: (url: string) => void; // navigate the app surface; the proxy hook reacts
  reload: () => void; // re-navigate the current url
  appReveal: () => void;
  appReady: () => void;
  appError: () => void;
  launchApp: (url: string) => void; // from the os: load + show the app
}

export type SimulatorStore = ReturnType<typeof createSimulatorStore>;

export type Seed = Partial<
  Pick<
    SimulatorState,
    | "screen"
    | "view"
    | "url"
    | "status"
    | "loadToken"
    | "additive"
    | "background"
    | "customBackgroundImages"
    | "activeCustomBackgroundId"
    | "lensTint"
    | "backgroundBrightness"
    | "backgroundBlur"
    | "displayBrightness"
    | "displayPanelOpen"
  >
>;

export function createSimulatorStore(seed?: Seed) {
  return createStore<SimulatorState>()((set) => ({
    screen: seed?.screen ?? "app",
    view: seed?.view ?? "glasses",
    url: seed?.url ?? "",
    status: seed?.status ?? "idle",
    loadToken: seed?.loadToken ?? 0,
    additive: seed?.additive ?? true,
    background: seed?.background ?? DEFAULT_BACKGROUND,
    customBackgroundImages: seed?.customBackgroundImages ?? [],
    activeCustomBackgroundId: seed?.activeCustomBackgroundId ?? null,
    lensTint: seed?.lensTint ?? false,
    backgroundBrightness: seed?.backgroundBrightness ?? 80,
    backgroundBlur: seed?.backgroundBlur ?? 0,
    displayBrightness: seed?.displayBrightness ?? 100,
    displayPanelOpen: seed?.displayPanelOpen ?? true,

    setScreen: (screen) => set({ screen }),
    setView: (view) => set({ view }),
    setUrl: (url) => set({ url }),
    setAdditive: (additive) => set({ additive }),
    setBackground: (background) => set({ background }),
    addCustomBackground: (url, thumbUrl) =>
      set((s) => {
        const id = crypto.randomUUID();
        return {
          customBackgroundImages: [...s.customBackgroundImages, { id, url, thumbUrl }],
          activeCustomBackgroundId: id,
          background: "custom",
        };
      }),
    selectCustomBackground: (id) =>
      set((s) =>
        s.customBackgroundImages.some((img) => img.id === id)
          ? { activeCustomBackgroundId: id, background: "custom" as const }
          : {},
      ),
    removeCustomBackground: (id) =>
      set((s) => {
        const rest = s.customBackgroundImages.filter((img) => img.id !== id);
        if (rest.length === s.customBackgroundImages.length) return {};

        const wasActive = s.activeCustomBackgroundId === id;
        if (!wasActive) return { customBackgroundImages: rest };

        const nextActive = rest.at(-1)?.id ?? null;
        return {
          customBackgroundImages: rest,
          activeCustomBackgroundId: nextActive,
          background: nextActive ? ("custom" as const) : DEFAULT_BACKGROUND,
        };
      }),
    setLensTint: (lensTint) => set({ lensTint }),
    setBackgroundBrightness: (backgroundBrightness) => set({ backgroundBrightness }),
    setBackgroundBlur: (backgroundBlur) => set({ backgroundBlur }),
    setDisplayBrightness: (displayBrightness) => set({ displayBrightness }),
    setDisplayPanelOpen: (open) => {
      writeDisplayPanelOpen(open);
      set({ displayPanelOpen: open });
    },
    toggleDisplayPanel: () =>
      set((s) => {
        const open = !s.displayPanelOpen;
        writeDisplayPanelOpen(open);
        return { displayPanelOpen: open };
      }),
    requestLoad: (url) => set((s) => ({ url, status: "loading", loadToken: s.loadToken + 1 })),
    reload: () => set((s) => ({ screen: "app", status: "loading", loadToken: s.loadToken + 1 })),
    appReveal: () => set({ status: "revealing" }),
    appReady: () => set({ status: "ready" }),
    appError: () => set({ status: "error" }),
    launchApp: (url) =>
      set((s) => ({ screen: "app", url, status: "loading", loadToken: s.loadToken + 1 })),
  }));
}
