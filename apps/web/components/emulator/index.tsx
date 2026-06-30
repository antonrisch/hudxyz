"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type RefObject } from "react";
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
import { normalizeWebUrl } from "@/lib/emulator/normalize-url";
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
  pressedIntents: ReadonlySet<Intent>;
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
      const url = normalizeWebUrl(raw);
      if (!url) return;
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

  const [pressedIntents, setPressedIntents] = useState<ReadonlySet<Intent>>(() => new Set());

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
    },
    [store],
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

  // host keys inject into the frame; frame keys only mirror the visual pressed state.
  useMountEffect(() => {
    const setIntentPressed = (intent: Intent, pressed: boolean) => {
      setPressedIntents((prev) => {
        if (prev.has(intent) === pressed) return prev;
        const next = new Set(prev);
        if (pressed) next.add(intent);
        else next.delete(intent);
        return next;
      });
    };

    const clearPressed = () => setPressedIntents((prev) => (prev.size ? new Set() : prev));
    const getIntent = (e: KeyboardEvent) => (e.isTrusted ? INTENT_BY_KEY[e.key] : undefined);

    const isEditable = (el: EventTarget | null) => {
      const tag = (el as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON";
    };

    const iframeFocused = () => document.activeElement === iframeRef.current;

    const onHostKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void captureRef.current();
        return;
      }
      const intent = getIntent(e);
      if (!intent) return;
      if (isEditable(document.activeElement)) return;
      if (iframeFocused()) return; // iframe window listener owns trusted keys + visuals
      e.preventDefault();
      setIntentPressed(intent, true);
      pressRef.current(intent);
    };

    const onHostKeyUp = (e: KeyboardEvent) => {
      const intent = getIntent(e);
      if (!intent) return;
      setIntentPressed(intent, false);
    };

    const onFrameKeyDown = (e: KeyboardEvent) => {
      const intent = getIntent(e); // ignore keys we inject from the host handler
      if (!intent) return;
      if (isEditable(e.target)) return;
      setIntentPressed(intent, true);
    };

    const onFrameKeyUp = (e: KeyboardEvent) => {
      const intent = getIntent(e);
      if (!intent) return;
      setIntentPressed(intent, false);
    };

    let detachFrame = () => {};

    const attachFrame = () => {
      detachFrame();
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.addEventListener("keydown", onFrameKeyDown);
      win.addEventListener("keyup", onFrameKeyUp);
      win.addEventListener("blur", clearPressed);
      detachFrame = () => {
        win.removeEventListener("keydown", onFrameKeyDown);
        win.removeEventListener("keyup", onFrameKeyUp);
        win.removeEventListener("blur", clearPressed);
      };
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", attachFrame);
    attachFrame();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") clearPressed();
    };

    window.addEventListener("keydown", onHostKeyDown);
    window.addEventListener("keyup", onHostKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      iframe?.removeEventListener("load", attachFrame);
      detachFrame();
      window.removeEventListener("keydown", onHostKeyDown);
      window.removeEventListener("keyup", onHostKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  const ctx = useMemo<EmulatorContextValue>(
    () => ({ store, iframeRef, displayRef, load, press, pressedIntents, captureDisplay, setView, panZoom }),
    [store, load, press, pressedIntents, captureDisplay, setView, panZoom],
  );

  return (
    <EmulatorContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader />

        {/* device canvas fills the rest; the d-pad is a floating panel over the bottom edge. */}
        <div className="relative mx-3 mb-3 flex min-h-0 flex-1 flex-col rounded-2xl bg-linear-to-b from-canvas-from to-canvas-to">
          <Device />
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <Dpad />
          </div>
        </div>
      </div>
    </EmulatorContext.Provider>
  );
}
