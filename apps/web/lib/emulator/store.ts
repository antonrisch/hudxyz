import { createStore } from "zustand/vanilla";

// headless emulator core: a DOM-free state machine. all side effects (proxy, iframe,
// history) live in the shell hooks that subscribe to this store, so the core stays
// unit-testable in node and liftable into a package later.

export type Mode = "os" | "app"; // what the device screen shows: a proxied app, or the baby os
export type Status = "idle" | "loading" | "ready" | "error"; // app load lifecycle
export type View = "glasses" | "fit" | "actual"; // host chrome around the device
export type Intent = "up" | "down" | "left" | "right" | "select" | "back"; // d-pad gestures

export interface EmulatorState {
  mode: Mode;
  view: View;
  url: string; // address-bar text / current app url
  status: Status;
  loadToken: number; // bump to (re)trigger a navigation; lets reload re-fire on the same url

  setView: (view: View) => void;
  setUrl: (url: string) => void;
  requestLoad: (url: string) => void; // navigate the app surface; the proxy hook reacts
  appReady: () => void;
  appError: () => void;
  exitToOs: () => void; // back/esc out of an app -> baby os (seam; no control wired yet)
  launchApp: (url: string) => void; // from the os -> run an app
}

export type EmulatorStore = ReturnType<typeof createEmulatorStore>;

type Seed = Partial<Pick<EmulatorState, "mode" | "view" | "url">>;

export function createEmulatorStore(seed?: Seed) {
  return createStore<EmulatorState>()((set) => ({
    mode: seed?.mode ?? "app",
    view: seed?.view ?? "glasses",
    url: seed?.url ?? "",
    status: "idle",
    loadToken: 0,

    setView: (view) => set({ view }),
    setUrl: (url) => set({ url }),
    requestLoad: (url) => set((s) => ({ url, status: "loading", loadToken: s.loadToken + 1 })),
    appReady: () => set({ status: "ready" }),
    appError: () => set({ status: "error" }),
    exitToOs: () => set({ mode: "os" }),
    launchApp: (url) =>
      set((s) => ({ mode: "app", url, status: "loading", loadToken: s.loadToken + 1 })),
  }));
}
