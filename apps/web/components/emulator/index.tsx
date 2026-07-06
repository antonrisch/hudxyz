"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useQueryState } from "nuqs";
import { useStore } from "zustand";
import {
  createEmulatorStore,
  type EmulatorState,
  type EmulatorStore,
  type Intent,
  type Seed,
  type View,
} from "@/lib/emulator/store";
import { INTENT_BY_KEY, KEY_BY_INTENT } from "@/lib/emulator/config";
import { EnvironmentBackdrop } from "@/components/emulator/environment-backdrop";
import { resolveEnvironment } from "@/lib/emulator/environment";
import {
  getCachedIframeEnvironmentImage,
  resolveIframeEnvironmentImage,
} from "@/lib/emulator/environment-image";
import {
  measureAdditiveBackdrop,
  syncAdditive,
  syncDisplayBrightness,
} from "@/lib/emulator/additive";
import { emulatorParsers } from "@/lib/emulator/search-params";
import { normalizeWebUrl } from "@/lib/emulator/normalize-url";
import { useMountEffect } from "@/lib/use-mount-effect";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";
import { AppHeader } from "@/components/emulator/app-header";
import { Dpad } from "@/components/emulator/dpad";
import { Device } from "@/components/emulator/device";
import { DisplaySidebar } from "@/components/emulator/display-sidebar";
import { applyPanZoomShortcut, usePanZoom, type PanZoom } from "@/components/emulator/use-pan-zoom";
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
  pressDown: (intent: Intent) => void;
  pressUp: (intent: Intent) => void;
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
export default function Emulator({ seed }: { seed: Seed }) {
  const storeRef = useRef<EmulatorStore>(undefined);
  const store = (storeRef.current ??= createEmulatorStore(seed));
  const [, setModeParam] = useQueryState("mode", emulatorParsers.mode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<Frame | null>(null);
  const view = useStore(store, (s) => s.view);
  const environmentKey = useStore(store, (s) => s.environment);
  const customEnvironmentImages = useStore(store, (s) => s.customEnvironmentImages);
  const activeCustomEnvironmentId = useStore(store, (s) => s.activeCustomEnvironmentId);
  const environment = resolveEnvironment(
    environmentKey,
    customEnvironmentImages,
    activeCustomEnvironmentId,
  );
  const backgroundBrightness = useStore(store, (s) => s.backgroundBrightness);
  const backgroundBlur = useStore(store, (s) => s.backgroundBlur);
  const panZoom = usePanZoom(view);
  const panZoomRef = useRef(panZoom);
  panZoomRef.current = panZoom;

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
  const dispatchIntent = useCallback(
    (intent: Intent, type: "keydown" | "keyup") => {
      if (store.getState().screen !== "app") return; // os input lands here later
      const iframe = iframeRef.current;
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        iframe?.focus();

        const doc = win.document;
        const HTMLElementCtor = (win as Window & { HTMLElement: typeof HTMLElement }).HTMLElement;
        const active = doc.activeElement instanceof HTMLElementCtor ? doc.activeElement : null;
        const target =
          active && active !== doc.body && active !== doc.documentElement
            ? active
            : (doc.querySelector<HTMLElement>(".screen.active .focusable") ??
              doc.querySelector<HTMLElement>("#game-canvas") ??
              doc.querySelector<HTMLElement>(".screen.active .screen-content") ??
              doc.body ??
              doc.documentElement);

        target?.focus?.({ preventScroll: true });

        const Ev = (win as Window & { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
        const key = KEY_BY_INTENT[intent];
        const handled = !target.dispatchEvent(
          new Ev(type, { key, bubbles: true, cancelable: true }),
        );
        const activatable = target.matches(
          'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="menuitem"]',
        );
        if (type === "keydown" && intent === "select" && !handled && activatable) target.click?.();
      } catch {
        // frame not loaded / not same-origin yet
      }
    },
    [store],
  );

  const press = useCallback(
    (intent: Intent) => dispatchIntent(intent, "keydown"),
    [dispatchIntent],
  );

  const pressRef = useRef(press);
  pressRef.current = press;

  const [pressedIntents, setPressedIntents] = useState<ReadonlySet<Intent>>(() => new Set());

  const setIntentPressed = useCallback((intent: Intent, pressed: boolean) => {
    setPressedIntents((prev) => {
      if (prev.has(intent) === pressed) return prev;
      const next = new Set(prev);
      if (pressed) next.add(intent);
      else next.delete(intent);
      return next;
    });
  }, []);

  const pressDown = useCallback(
    (intent: Intent) => {
      setIntentPressed(intent, true);
      press(intent);
    },
    [press, setIntentPressed],
  );

  const pressUp = useCallback(
    (intent: Intent) => {
      setIntentPressed(intent, false);
      dispatchIntent(intent, "keyup");
    },
    [dispatchIntent, setIntentPressed],
  );

  const captureDisplay = useCallback(async () => {
    const { screen, status } = store.getState();
    if (screen !== "app" || status !== "ready") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    await downloadDisplay(iframe);
  }, [store]);

  const captureRef = useRef(captureDisplay);
  captureRef.current = captureDisplay;

  // switch chrome, mirror to url, reset zoom when re-selecting the active view (switches
  // reset in usePanZoom once the new chrome has laid out).
  const setView = useCallback(
    (next: View) => {
      const same = store.getState().view === next;
      store.getState().setView(next);
      void setModeParam(next);
      if (same) panZoomRef.current.reset(next);
    },
    [store, setModeParam],
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
          if (new URL(url).origin === window.location.origin) {
            el.src = url;
            store.getState().appReady();
            return;
          }

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

  // additive preview lives inside the proxied document so black pixels blend with the
  // environment before the iframe crosses transformed emulator chrome.
  useMountEffect(() => {
    let applyToken = 0;
    let resolvedImage: string | undefined;
    let resolvedImageSource: string | undefined;
    let animationFrame = 0;

    const syncCurrentAdditive = () => {
      const {
        additive,
        lensTint,
        environment,
        customEnvironmentImages,
        activeCustomEnvironmentId,
        backgroundBrightness,
        backgroundBlur,
        displayBrightness,
      } = store.getState();
      const preset = resolveEnvironment(
        environment,
        customEnvironmentImages,
        activeCustomEnvironmentId,
      );
      const geometry = measureAdditiveBackdrop(stageRef.current, displayRef.current);
      syncAdditive(
        iframeRef.current,
        additive,
        preset,
        resolvedImage,
        geometry,
        lensTint,
        backgroundBrightness,
        backgroundBlur,
      );
      syncDisplayBrightness(iframeRef.current, displayBrightness);
    };

    const applyAdditive = () => {
      const { additive, environment, customEnvironmentImages, activeCustomEnvironmentId } =
        store.getState();
      const token = ++applyToken;
      const preset = resolveEnvironment(
        environment,
        customEnvironmentImages,
        activeCustomEnvironmentId,
      );
      const source = preset.image;

      if (!additive) {
        resolvedImage = undefined;
        resolvedImageSource = undefined;
        syncCurrentAdditive();
        return;
      }

      if (!source) {
        resolvedImage = undefined;
        resolvedImageSource = undefined;
        syncCurrentAdditive();
        return;
      }

      const cached = getCachedIframeEnvironmentImage(source);
      if (cached) {
        resolvedImage = cached;
        resolvedImageSource = source;
        syncCurrentAdditive();
        return;
      }

      if (source === resolvedImageSource && resolvedImage) {
        syncCurrentAdditive();
        return;
      }

      resolvedImage = source.startsWith("data:") ? source : undefined;
      resolvedImageSource = source;
      syncCurrentAdditive();

      void resolveIframeEnvironmentImage(source)
        .then((nextImage) => {
          if (token !== applyToken) return;
          resolvedImage = nextImage;
          resolvedImageSource = source;
          syncCurrentAdditive();
        })
        .catch(() => {
          if (token !== applyToken) return;
          resolvedImage = undefined;
          resolvedImageSource = undefined;
          syncCurrentAdditive();
        });
    };

    const tickGeometry = () => {
      if (store.getState().additive) syncCurrentAdditive();
      animationFrame = requestAnimationFrame(tickGeometry);
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", applyAdditive);
    const unsub = store.subscribe((state, prev) => {
      if (
        state.additive !== prev.additive ||
        state.lensTint !== prev.lensTint ||
        state.environment !== prev.environment ||
        state.customEnvironmentImages !== prev.customEnvironmentImages ||
        state.activeCustomEnvironmentId !== prev.activeCustomEnvironmentId ||
        state.backgroundBrightness !== prev.backgroundBrightness ||
        state.backgroundBlur !== prev.backgroundBlur ||
        state.displayBrightness !== prev.displayBrightness
      ) {
        applyAdditive();
      }
    });

    applyAdditive();
    animationFrame = requestAnimationFrame(tickGeometry);
    return () => {
      cancelAnimationFrame(animationFrame);
      iframe?.removeEventListener("load", applyAdditive);
      unsub();
    };
  });

  // host keys inject into the frame; frame keys only mirror the visual pressed state.
  useMountEffect(() => {
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
      if (applyPanZoomShortcut(e, panZoomRef.current)) return;
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
      detachFrame = () => {};
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.addEventListener("keydown", onFrameKeyDown);
        win.addEventListener("keyup", onFrameKeyUp);
        win.addEventListener("blur", clearPressed);
      } catch {
        // the iframe can briefly expose a cross-origin WindowProxy while navigating.
        return;
      }
      detachFrame = () => {
        try {
          win.removeEventListener("keydown", onFrameKeyDown);
          win.removeEventListener("keyup", onFrameKeyUp);
          win.removeEventListener("blur", clearPressed);
        } catch {
          // the frame may have navigated cross-origin since the listeners were attached.
        }
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
    () => ({
      store,
      iframeRef,
      displayRef,
      load,
      press,
      pressDown,
      pressUp,
      pressedIntents,
      captureDisplay,
      setView,
      panZoom,
    }),
    [store, load, press, pressDown, pressUp, pressedIntents, captureDisplay, setView, panZoom],
  );

  return (
    <EmulatorContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader />

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl px-2 pb-2 gap-2">
          {/* device canvas; the d-pad is a floating panel over the bottom edge. */}
          <div
            ref={stageRef}
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-env-fill"
          >
            <EnvironmentBackdrop
              preset={environment}
              backgroundBrightness={backgroundBrightness}
              backgroundBlur={backgroundBlur}
            />
            <Device />
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-4">
              <Dpad />
            </div>
          </div>
          <DisplaySidebar />
        </div>
      </div>
    </EmulatorContext.Provider>
  );
}
