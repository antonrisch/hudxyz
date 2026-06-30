"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useStore } from "zustand";
import {
  createEmulatorStore,
  type EmulatorState,
  type EmulatorStore,
  type Intent,
  type View,
} from "@/lib/emulator/store";
import { INTENT_BY_KEY, KEY_BY_INTENT } from "@/lib/emulator/config";
import { readEmulatorSearchSeed, syncViewToUrl } from "@/lib/emulator/search-params";
import { useMountEffect } from "@/lib/use-mount-effect";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";
import { AppHeader } from "@/components/emulator/app-header";
import { Dpad } from "@/components/emulator/dpad";
import { Device } from "@/components/emulator/device";
import { usePanZoom, type PanZoom } from "@/components/emulator/use-pan-zoom";
import { downloadDisplay } from "@/lib/emulator/capture";

// -- context ------------------------------------------------
// stable handles for the leaf components: the store (read via useEmulatorState),
// the shared iframe ref, and the two behavior entry points (load / press).
interface EmulatorContextValue {
  store: EmulatorStore;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  displayRef: RefObject<HTMLDivElement | null>;
  load: (raw: string) => void;
  press: (intent: Intent) => void;
  captureDisplay: () => Promise<void>;
  setView: (view: View) => void;
  panZoom: PanZoom;
}

const EmulatorContext = createContext<EmulatorContextValue | null>(null);

export function useEmulator() {
  const ctx = useContext(EmulatorContext);
  if (!ctx) throw new Error("useEmulator must be used within <Emulator>");
  return ctx;
}

// selector hook over the core store
export function useEmulatorState<T>(selector: (s: EmulatorState) => T): T {
  return useStore(useEmulator().store, selector);
}

// -- root ---------------------------------------------------
export default function Emulator() {
  const storeRef = useRef<EmulatorStore>(undefined);
  const store = (storeRef.current ??= createEmulatorStore(readEmulatorSearchSeed()));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<Frame | null>(null);
  const view = useStore(store, (s) => s.view);
  const panZoom = usePanZoom(view);

  // navigate: route the target through the same-origin proxy. created once, reused.
  const load = useCallback(
    (raw: string) => {
      const url = raw.trim();
      if (!/^https?:\/\//i.test(url)) return;
      store.getState().requestLoad(url);
    },
    [store],
  );

  // inject a d-pad gesture. app mode -> dispatch the mapped key into the proxied frame's
  // realm so its listeners accept it. os mode -> drive the baby os (stub seam).
  const press = useCallback(
    (intent: Intent) => {
      if (store.getState().screen !== "app") return; // os input lands here later
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        const Ev = (win as Window & { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
        const key = KEY_BY_INTENT[intent];
        win.document.dispatchEvent(new Ev("keydown", { key, bubbles: true, cancelable: true }));
      } catch {
        // frame not loaded / not same-origin yet
      }
    },
    [store],
  );

  const pressRef = useRef(press);
  pressRef.current = press;

  const captureDisplay = useCallback(async () => {
    const { screen, status } = store.getState();
    if (screen !== "app" || status !== "ready") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    await downloadDisplay(iframe);
  }, [store]);

  const captureRef = useRef(captureDisplay);
  captureRef.current = captureDisplay;

  // switch chrome, mirror it to the url, and recenter for the target view on the next frame
  // (after the new chrome has laid out so the measurement is correct).
  const setView = useCallback(
    (next: View) => {
      store.getState().setView(next);
      syncViewToUrl(next);
      requestAnimationFrame(() => panZoom.reset(next));
    },
    [store, panZoom],
  );

  // proxy navigation: react to loadToken (bumped by requestLoad/launchApp/reload).
  useMountEffect(() => {
    let cancelNav = () => {};

    const navigate = () => {
      cancelNav();
      let cancelled = false;
      cancelNav = () => {
        cancelled = true;
      };

      const el = iframeRef.current;
      if (!el) return;
      const { url } = store.getState();
      (async () => {
        try {
          const frame = (frameRef.current ??= await createFrame(el));
          if (cancelled) return;
          frame.go(url);
          store.getState().appReady();
        } catch {
          if (!cancelled) store.getState().appError();
        }
      })();
    };

    const unsub = store.subscribe((state, prev) => {
      if (state.loadToken !== prev.loadToken && state.loadToken !== 0) navigate();
    });

    if (store.getState().loadToken > 0) navigate();

    return () => {
      cancelNav();
      unsub();
    };
  });

  // forward physical d-pad keys to the device even when the frame isn't focused
  useMountEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void captureRef.current();
        return;
      }
      const intent = INTENT_BY_KEY[e.key];
      if (!intent) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      pressRef.current(intent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ctx = useMemo<EmulatorContextValue>(
    () => ({ store, iframeRef, displayRef, load, press, captureDisplay, setView, panZoom }),
    [store, load, press, captureDisplay, setView, panZoom],
  );

  return (
    <EmulatorContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader />

        {/* device canvas fills the rest; the d-pad is a floating panel over the bottom edge. */}
        <div className="relative mx-3 mb-3 flex min-h-0 flex-1 flex-col rounded-2xl bg-linear-to-b from-canvas-from to-canvas-to">
          <Device />
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <Dpad />
          </div>
        </div>
      </div>
    </EmulatorContext.Provider>
  );
}
