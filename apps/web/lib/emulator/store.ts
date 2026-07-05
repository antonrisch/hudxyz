import { createStore } from "zustand/vanilla";
import {
  DEFAULT_ENVIRONMENT,
  type CustomEnvironmentImage,
  type EnvironmentKey,
} from "@/lib/emulator/environment";

const DISPLAY_PANEL_OPEN_KEY = "emulator.displayPanelOpen";

function readDisplayPanelOpen(): boolean {
  try {
    const stored = localStorage.getItem(DISPLAY_PANEL_OPEN_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function writeDisplayPanelOpen(open: boolean) {
  try {
    localStorage.setItem(DISPLAY_PANEL_OPEN_KEY, String(open));
  } catch {
    // storage unavailable (private browsing, etc.)
  }
}

// headless emulator core: a DOM-free state machine. all side effects (proxy, iframe,
// history, pan/zoom) live in the shell hooks that subscribe to this store, so the core
// stays unit-testable in node and liftable into a package later. (pan/zoom needs DOM
// measurement, so it lives in usePanZoom, not here.)

// what the device screen shows. app: the running proxied app (keys inject here). settings:
// a blurred control overlay over the app. home / apps: baby-os screens (stubs for now).
export type Screen = "app" | "settings" | "home" | "apps";
export type Status = "idle" | "loading" | "ready" | "error"; // app load lifecycle
export type View = "glasses" | "actual"; // host chrome around the device
export type Intent = "up" | "down" | "left" | "right" | "select" | "back"; // d-pad gestures

export interface EmulatorState {
  screen: Screen;
  view: View;
  url: string; // address-bar text / current app url
  status: Status;
  loadToken: number; // bump to (re)trigger a navigation; lets reload re-fire on the same url
  additive: boolean; // off = flat dev preview, on = full waveguide (black reads transparent)
  environment: EnvironmentKey; // world behind the waveguide (decoupled from canvas chrome)
  customEnvironmentImages: CustomEnvironmentImage[]; // session uploads (cleared on refresh)
  activeCustomEnvironmentId: string | null;
  lensTint: boolean; // cosmetic G-15 tint on svg lenses + additive env layer
  displayPanelOpen: boolean; // rhs display panel (persisted in localStorage on sm+)

  setScreen: (screen: Screen) => void;
  setView: (view: View) => void;
  setUrl: (url: string) => void;
  setAdditive: (additive: boolean) => void;
  setEnvironment: (environment: EnvironmentKey) => void;
  addCustomEnvironment: (url: string) => void;
  selectCustomEnvironment: (id: string) => void;
  setLensTint: (lensTint: boolean) => void;
  setDisplayPanelOpen: (open: boolean) => void;
  toggleDisplayPanel: () => void;
  requestLoad: (url: string) => void; // navigate the app surface; the proxy hook reacts
  reload: () => void; // re-navigate the current url
  appReady: () => void;
  appError: () => void;
  launchApp: (url: string) => void; // from the os: load + show the app
}

export type EmulatorStore = ReturnType<typeof createEmulatorStore>;

export type Seed = Partial<
  Pick<
    EmulatorState,
    | "screen"
    | "view"
    | "url"
    | "status"
    | "loadToken"
    | "additive"
    | "environment"
    | "customEnvironmentImages"
    | "activeCustomEnvironmentId"
    | "lensTint"
  >
>;

export function createEmulatorStore(seed?: Seed) {
  return createStore<EmulatorState>()((set) => ({
    screen: seed?.screen ?? "app",
    view: seed?.view ?? "glasses",
    url: seed?.url ?? "",
    status: seed?.status ?? "idle",
    loadToken: seed?.loadToken ?? 0,
    additive: seed?.additive ?? true,
    environment: seed?.environment ?? DEFAULT_ENVIRONMENT,
    customEnvironmentImages: seed?.customEnvironmentImages ?? [],
    activeCustomEnvironmentId: seed?.activeCustomEnvironmentId ?? null,
    lensTint: seed?.lensTint ?? false,
    displayPanelOpen: readDisplayPanelOpen(),

    setScreen: (screen) => set({ screen }),
    setView: (view) => set({ view }),
    setUrl: (url) => set({ url }),
    setAdditive: (additive) => set({ additive }),
    setEnvironment: (environment) => set({ environment }),
    addCustomEnvironment: (url) =>
      set((s) => {
        const id = crypto.randomUUID();
        return {
          customEnvironmentImages: [...s.customEnvironmentImages, { id, url }],
          activeCustomEnvironmentId: id,
          environment: "custom",
        };
      }),
    selectCustomEnvironment: (id) =>
      set((s) =>
        s.customEnvironmentImages.some((img) => img.id === id)
          ? { activeCustomEnvironmentId: id, environment: "custom" as const }
          : {},
      ),
    setLensTint: (lensTint) => set({ lensTint }),
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
    appReady: () => set({ status: "ready" }),
    appError: () => set({ status: "error" }),
    launchApp: (url) =>
      set((s) => ({ screen: "app", url, status: "loading", loadToken: s.loadToken + 1 })),
  }));
}
