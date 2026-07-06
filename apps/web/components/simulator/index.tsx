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
  createSimulatorStore,
  getPersistedDisplayPanelOpen,
  type SimulatorState,
  type SimulatorStore,
  type Intent,
  type Seed,
  type View,
} from "@/lib/simulator/store";
import { INTENT_BY_KEY } from "@/lib/simulator/config";
import { dispatchDeviceKey, isHostChromeInput } from "@/lib/simulator/input";
import { releaseChromeFocus } from "@/lib/simulator/input";
import { BackgroundBackdrop } from "@/components/simulator/background/backdrop";
import { resolveBackground } from "@/lib/simulator/background";
import {
  getCachedIframeBackgroundImage,
  prewarmPresetBackgroundImages,
  resolveIframeBackgroundImage,
} from "@/lib/simulator/background-image";
import {
  measureAdditiveBackdrop,
  syncAdditive,
  syncDisplayBrightness,
} from "@/lib/simulator/additive";
import { simulatorParsers } from "@/lib/simulator/search-params";
import { normalizeWebUrl } from "@/lib/simulator/search-params";
import { useMountEffect } from "@/lib/use-mount-effect";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";
import { AppHeader } from "@/components/simulator/header/app-header";
import { Dpad } from "@/components/simulator/input/dpad";
import { Device } from "@/components/simulator/device";
import { DisplaySidebarColumn } from "@/components/simulator/panel/sidebar";
import { applyPanZoomShortcut, usePanZoom, type PanZoom } from "@/components/simulator/use-pan-zoom";
import { waitForIframePaint } from "@/lib/simulator/app-load";
import { downloadDisplay } from "@/lib/simulator/capture";

// -- context ------------------------------------------------
// stable handles for the leaf components: the store (read via useSimulatorState),
// the shared iframe ref, and the two behavior entry points (load / press).
interface SimulatorContextValue {
  store: SimulatorStore;
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

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used within <Simulator>");
  return ctx;
}

// selector hook over the core store
export function useSimulatorState<T>(selector: (s: SimulatorState) => T): T {
  return useStore(useSimulator().store, selector);
}

// -- root ---------------------------------------------------
export default function Simulator({ seed }: { seed: Seed }) {
  const storeRef = useRef<SimulatorStore>(undefined);
  const store = (storeRef.current ??= createSimulatorStore(seed));
  const [, setModeParam] = useQueryState("mode", simulatorParsers.mode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<Frame | null>(null);
  const applyAdditiveRef = useRef<() => void>(() => {});
  const view = useStore(store, (s) => s.view);
  const backgroundKey = useStore(store, (s) => s.background);
  const customBackgroundImages = useStore(store, (s) => s.customBackgroundImages);
  const activeCustomBackgroundId = useStore(store, (s) => s.activeCustomBackgroundId);
  const background = resolveBackground(
    backgroundKey,
    customBackgroundImages,
    activeCustomBackgroundId,
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

  // inject a d-pad gesture. app mode -> synthesize the mapped key into the proxied frame.
  // os mode -> drive the baby os (stub seam).
  const dispatchIntent = useCallback(
    (intent: Intent, type: "keydown" | "keyup") => {
      if (store.getState().screen !== "app") return;
      dispatchDeviceKey(iframeRef.current, intent, type);
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
      releaseChromeFocus();
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

  // persisted panel open state lives in localStorage — hydrate after mount so SSR matches.
  useMountEffect(() => {
    const open = getPersistedDisplayPanelOpen();
    if (open !== store.getState().displayPanelOpen) {
      store.setState({ displayPanelOpen: open });
    }
  });

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
      const navToken = store.getState().loadToken;
      const isStale = () => cancelled || store.getState().loadToken !== navToken;

      const onLoad = () => {
        void (async () => {
          if (isStale() || store.getState().status !== "loading") return;

          const painted = await waitForIframePaint(el, isStale);
          if (!painted || isStale() || store.getState().status !== "loading") return;

          applyAdditiveRef.current();
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          if (isStale() || store.getState().status !== "loading") return;

          store.getState().appReveal();
        })();
      };

      el.addEventListener("load", onLoad);
      const prevCancel = cancelNav;
      cancelNav = () => {
        prevCancel();
        el.removeEventListener("load", onLoad);
      };

      const loadTimeout = window.setTimeout(() => {
        if (!isStale() && store.getState().status === "loading") {
          store.getState().appError();
        }
      }, 30_000);

      const clearLoadTimeout = () => window.clearTimeout(loadTimeout);
      const prevCancel2 = cancelNav;
      cancelNav = () => {
        prevCancel2();
        clearLoadTimeout();
      };

      void (async () => {
        try {
          if (new URL(url).origin === window.location.origin) {
            el.src = url;
            return;
          }

          const frame = (frameRef.current ??= await createFrame(el));
          if (isStale()) return;
          frame.go(url);
        } catch {
          if (!isStale()) store.getState().appError();
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
  // background before the iframe crosses transformed simulator chrome.
  useMountEffect(() => {
    prewarmPresetBackgroundImages();

    let applyToken = 0;
    let resolvedImage: string | undefined;
    let resolvedImageSource: string | undefined;
    let animationFrame = 0;

    const syncCurrentAdditive = () => {
      const {
        additive,
        lensTint,
        background: backgroundKey,
        customBackgroundImages,
        activeCustomBackgroundId,
        backgroundBrightness,
        backgroundBlur,
        displayBrightness,
      } = store.getState();
      const preset = resolveBackground(
        backgroundKey,
        customBackgroundImages,
        activeCustomBackgroundId,
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
      const {
        additive,
        background: backgroundKey,
        customBackgroundImages,
        activeCustomBackgroundId,
      } = store.getState();
      const token = ++applyToken;
      const preset = resolveBackground(
        backgroundKey,
        customBackgroundImages,
        activeCustomBackgroundId,
      );
      const source = preset.image;
      const customIframeDataUrl =
        backgroundKey === "custom"
          ? (
              customBackgroundImages.find((img) => img.id === activeCustomBackgroundId) ??
              customBackgroundImages[0]
            )?.iframeDataUrl
          : undefined;

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

      const cached = customIframeDataUrl ?? getCachedIframeBackgroundImage(source);
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

      if (source.startsWith("data:")) {
        resolvedImage = source;
        resolvedImageSource = source;
        syncCurrentAdditive();
        return;
      }

      resolvedImage = undefined;
      resolvedImageSource = source;
      syncCurrentAdditive();

      void resolveIframeBackgroundImage(source)
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
        state.background !== prev.background ||
        state.customBackgroundImages !== prev.customBackgroundImages ||
        state.activeCustomBackgroundId !== prev.activeCustomBackgroundId ||
        state.backgroundBrightness !== prev.backgroundBrightness ||
        state.backgroundBlur !== prev.backgroundBlur ||
        state.displayBrightness !== prev.displayBrightness
      ) {
        applyAdditive();
      }
    });

    applyAdditive();
    animationFrame = requestAnimationFrame(tickGeometry);
    applyAdditiveRef.current = applyAdditive;
    return () => {
      applyAdditiveRef.current = () => {};
      cancelAnimationFrame(animationFrame);
      iframe?.removeEventListener("load", applyAdditive);
      unsub();
    };
  });

  // physical keyboard mirrors the on-screen d-pad: host listeners drive inject + visuals.
  // if the iframe steals host focus, keys never reach window — blur it back, and mirror
  // trusted frame keys for visuals only (injection already happened natively there).
  useMountEffect(() => {
    const clearPressed = () => setPressedIntents((prev) => (prev.size ? new Set() : prev));
    const getIntent = (e: KeyboardEvent) => (e.isTrusted ? INTENT_BY_KEY[e.key] : undefined);
    const appIntent = (e: KeyboardEvent) => {
      const intent = getIntent(e);
      if (!intent || store.getState().screen !== "app") return undefined;
      return intent;
    };

    const onHostKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      if (applyPanZoomShortcut(e, panZoomRef.current)) return;
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void captureRef.current();
        return;
      }
      const intent = appIntent(e);
      if (!intent) return;
      if (isHostChromeInput(e.target)) return;
      e.preventDefault();
      setIntentPressed(intent, true);
      pressRef.current(intent);
    };

    const onHostKeyUp = (e: KeyboardEvent) => {
      const intent = getIntent(e);
      if (!intent) return;
      setIntentPressed(intent, false);
      if (!appIntent(e) || isHostChromeInput(e.target)) return;
      dispatchDeviceKey(iframeRef.current, intent, "keyup");
    };

    // trusted keys that land natively in the frame (iframe had host focus) — visuals only.
    const onFrameKeyDown = (e: KeyboardEvent) => {
      const intent = appIntent(e);
      if (!intent || isHostChromeInput(e.target)) return;
      setIntentPressed(intent, true);
    };

    const onFrameKeyUp = (e: KeyboardEvent) => {
      const intent = getIntent(e);
      if (!intent) return;
      setIntentPressed(intent, false);
    };

    const keepHostFocus = () => iframeRef.current?.blur();

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
        return;
      }
      detachFrame = () => {
        try {
          win.removeEventListener("keydown", onFrameKeyDown);
          win.removeEventListener("keyup", onFrameKeyUp);
          win.removeEventListener("blur", clearPressed);
        } catch {
          // navigated cross-origin since attach
        }
      };
    };

    const iframe = iframeRef.current;
    const onIframeLoad = () => {
      keepHostFocus();
      attachFrame();
    };

    iframe?.addEventListener("focus", keepHostFocus);
    iframe?.addEventListener("load", onIframeLoad);
    onIframeLoad();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") clearPressed();
    };

    window.addEventListener("keydown", onHostKeyDown);
    window.addEventListener("keyup", onHostKeyUp);
    window.addEventListener("blur", clearPressed);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      iframe?.removeEventListener("focus", keepHostFocus);
      iframe?.removeEventListener("load", onIframeLoad);
      detachFrame();
      window.removeEventListener("keydown", onHostKeyDown);
      window.removeEventListener("keyup", onHostKeyUp);
      window.removeEventListener("blur", clearPressed);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  const ctx = useMemo<SimulatorContextValue>(
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
    <SimulatorContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader />

        <div className="grid min-h-0 flex-1 gap-2 px-2 pb-2 grid-rows-[auto_1fr_auto] sm:grid-cols-[1fr_18rem] sm:grid-rows-1">
          <DisplaySidebarColumn />
          <div
            ref={stageRef}
            className="relative row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-stage-fill sm:col-start-1 sm:row-start-1"
          >
            <BackgroundBackdrop
              preset={background}
              backgroundBrightness={backgroundBrightness}
              backgroundBlur={backgroundBlur}
            />
            <Device />
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-4">
              <Dpad />
            </div>
          </div>
        </div>
      </div>
    </SimulatorContext.Provider>
  );
}
