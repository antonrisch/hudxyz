"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { INTENT_BY_KEY, KEY_BY_INTENT, VIEWS } from "@/lib/emulator/config";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";
import { cn } from "@/lib/utils";
import { UrlBar } from "@/components/emulator/url-bar";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { Dpad } from "@/components/emulator/dpad";
import { Device } from "@/components/emulator/device";

// -- context ------------------------------------------------
// stable handles for the leaf components: the store (read via useEmulatorState),
// the shared iframe ref, and the two behavior entry points (load / press).
interface EmulatorContextValue {
  store: EmulatorStore;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  load: (raw: string) => void;
  press: (intent: Intent) => void;
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
  const store = (storeRef.current ??= createEmulatorStore());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameRef = useRef<Frame | null>(null);

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
      if (store.getState().mode !== "app") return; // os input lands here later
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

  // proxy navigation: react to loadToken (bumped by requestLoad/launchApp, so reload of the
  // same url re-fires). read url imperatively so typing in the address bar doesn't navigate.
  const loadToken = useStore(store, (s) => s.loadToken);
  useEffect(() => {
    if (loadToken === 0) return;
    const el = iframeRef.current;
    if (!el) return;
    const { url } = store.getState();
    let cancelled = false;
    (async () => {
      try {
        const frame = (frameRef.current ??= await createFrame(el));
        if (cancelled) return;
        frame.go(url); // v2 has no encodeUrl
        store.getState().appReady();
      } catch {
        if (!cancelled) store.getState().appError();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadToken, store]);

  // forward physical d-pad keys to the device even when the frame isn't focused
  // (focused -> the frame gets them natively, so the parent never sees them).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const intent = INTENT_BY_KEY[e.key];
      if (!intent) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      press(intent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // deep-link on mount: ?view=... selects the chrome, ?url=... prefills + loads
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("view");
    if (v && VIEWS.some((x) => x.key === v)) store.getState().setView(v as View);
    const u = p.get("url");
    if (u) {
      store.getState().setUrl(u);
      load(u);
    }
  }, [store, load]);

  // reflect the view in ?view= client-side (no navigation). skip the first run so the
  // mount deep-link above stays authoritative; default glasses keeps the url clean.
  const view = useStore(store, (s) => s.view);
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    const p = new URLSearchParams(window.location.search);
    if (view === "glasses") p.delete("view");
    else p.set("view", view);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [view]);

  const ctx = useMemo<EmulatorContextValue>(
    () => ({ store, iframeRef, load, press }),
    [store, load, press],
  );

  return (
    <EmulatorContext.Provider value={ctx}>
      <div
        className={cn(
          "flex flex-col items-center gap-6 p-8",
          // fit fills the viewport remainder under the header so the device never scrolls
          view === "fit" && "h-[calc(100svh-var(--header-h))] w-full",
        )}
      >
        <UrlBar />
        <ViewSwitcher />
        <Device />
        <Dpad />
      </div>
    </EmulatorContext.Provider>
  );
}
