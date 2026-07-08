"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useQueryState } from "nuqs";
import { useStore } from "zustand";
import {
  createSimulatorStore,
  migrateLegacySimulatorPreferences,
  type SimulatorState,
  type SimulatorStore,
  type Intent,
  type Seed,
  type ToolbarPlacement,
  type View,
} from "@/lib/simulator/store";
import { INTENT_BY_KEY, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { dispatchDeviceKey, isHostChromeInput } from "@/lib/simulator/input";
import { releaseChromeFocus } from "@/lib/simulator/input";
import { BackgroundBackdrop } from "@/components/simulator/background/backdrop";
import { resolveBackground, resolveBackdropPlaceholder } from "@/lib/simulator/background";
import {
  measureAdditiveBackdrop,
  settleAdditiveSync,
  clearIframeBodyBlend,
  syncDisplayBrightness,
  syncHostAdditive,
} from "@/lib/simulator/additive";
import { simulatorParsers } from "@/lib/simulator/search-params";
import { normalizeWebUrl } from "@/lib/simulator/search-params";
import { useMountEffect } from "@/lib/use-mount-effect";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";
import { AppHeader } from "@/components/simulator/header/app-header";
import { Toolbar } from "@/components/simulator/toolbar";
import { Device } from "@/components/simulator/device";
import {
  DisplaySidebarColumn,
} from "@/components/simulator/panel/sidebar";
import { usePanZoom, type PanZoom } from "@/components/simulator/use-pan-zoom";
import { waitForIframePaint } from "@/lib/simulator/app-load";
import { downloadStage, type StageCaptureTarget } from "@/lib/simulator/capture";
import { createStageRecorder, downloadStageRecording } from "@/lib/simulator/record";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// -- context ------------------------------------------------
// stable handles for the leaf components: the store (read via useSimulatorState),
// the shared iframe ref, and the two behavior entry points (load / press).
interface SimulatorContextValue {
  store: SimulatorStore;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  displayRef: RefObject<HTMLDivElement | null>;
  urlInputRef: RefObject<HTMLInputElement | null>;
  load: (raw: string) => void;
  press: (intent: Intent) => void;
  pressDown: (intent: Intent) => void;
  pressUp: (intent: Intent) => void;
  pressedIntents: ReadonlySet<Intent>;
  captureDisplay: () => Promise<void>;
  recordScreen: () => void | Promise<void>;
  isRecording: boolean;
  setView: (view: View) => void;
  panZoom: PanZoom;
  syncAdditive: () => void;
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
  const urlInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
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
  const backdropPlaceholder = resolveBackdropPlaceholder(
    backgroundKey,
    customBackgroundImages,
    activeCustomBackgroundId,
  );
  const backgroundBrightness = useStore(store, (s) => s.backgroundBrightness);
  const backgroundBlur = useStore(store, (s) => s.backgroundBlur);
  const displayPanelOpen = useStore(store, (s) => s.displayPanelOpen);
  const toolbarPlacement = useStore(store, (s) => s.toolbarPlacement);
  const dockToolbarOnDesktop = toolbarPlacement === "sidebar";
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

  const additiveSyncKeyRef = useRef("");
  const syncHostAdditiveLayersRef = useRef<() => void>(() => {});

  const getAdditiveCaptureContext = useCallback((): StageCaptureTarget["additiveContext"] => {
    const {
      additive,
      background: backgroundKey,
      customBackgroundImages,
      activeCustomBackgroundId,
      backgroundBrightness,
      backgroundBlur,
    } = store.getState();
    if (!additive) return undefined;
    return {
      preset: resolveBackground(backgroundKey, customBackgroundImages, activeCustomBackgroundId),
      backgroundBrightness,
      backgroundBlur,
      onBeforeCapture: () => syncHostAdditiveLayersRef.current(),
    };
  }, [store]);
  const getAdditiveCaptureContextRef = useRef(getAdditiveCaptureContext);
  getAdditiveCaptureContextRef.current = getAdditiveCaptureContext;

  const captureDisplay = useCallback(async () => {
    const {
      screen,
      status,
      additive,
      background: backgroundKey,
      customBackgroundImages,
      activeCustomBackgroundId,
      backgroundBrightness,
      backgroundBlur,
    } = store.getState();
    if (screen !== "app" || status !== "ready") return;
    const stage = stageRef.current;
    if (!stage) return;
    const preset = resolveBackground(
      backgroundKey,
      customBackgroundImages,
      activeCustomBackgroundId,
    );
    await downloadStage({
      stage,
      backdrop: backdropRef.current,
      display: displayRef.current,
      iframe: iframeRef.current,
      frames: stage.querySelector<SVGSVGElement>('[data-capture="frames"]'),
      lensTint: store.getState().lensTint,
      additive,
      additiveContext: additive
        ? {
            preset,
            backgroundBrightness,
            backgroundBlur,
            onBeforeCapture: () => syncHostAdditiveLayersRef.current(),
          }
        : undefined,
    });
  }, [store]);

  const captureRef = useRef(captureDisplay);
  captureRef.current = captureDisplay;

  const stageRecorderRef = useRef<ReturnType<typeof createStageRecorder> | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  type RecordChromeSnapshot = {
    toolbarPlacement: ToolbarPlacement;
    displayPanelOpen: boolean;
  };
  const recordChromeRestoreRef = useRef<RecordChromeSnapshot | null>(null);

  const restoreRecordChrome = useCallback(() => {
    const saved = recordChromeRestoreRef.current;
    if (!saved) return;
    recordChromeRestoreRef.current = null;
    const { setToolbarPlacement, setDisplayPanelOpen } = store.getState();
    setToolbarPlacement(saved.toolbarPlacement, false);
    setDisplayPanelOpen(saved.displayPanelOpen, false);
  }, [store]);

  const prepareRecordChrome = useCallback(async () => {
    const { toolbarPlacement, displayPanelOpen } = store.getState();
    if (toolbarPlacement === "sidebar") return;

    recordChromeRestoreRef.current = { toolbarPlacement, displayPanelOpen };
    store.getState().setToolbarPlacement("sidebar", false);
    if (!displayPanelOpen) store.getState().setDisplayPanelOpen(true, false);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, [store]);

  useMountEffect(() => {
    stageRecorderRef.current = createStageRecorder({
      getStage: () => stageRef.current,
      getBackdrop: () => backdropRef.current,
      getDisplay: () => displayRef.current,
      getIframe: () => iframeRef.current,
      getFrames: () =>
        stageRef.current?.querySelector<SVGSVGElement>('[data-capture="frames"]') ?? null,
      getLensTint: () => store.getState().lensTint,
      getAdditive: () => store.getState().additive,
      getAdditiveContext: () => getAdditiveCaptureContextRef.current(),
      onAutoStop: (blob) => {
        if (blob) downloadStageRecording(blob);
        setIsRecording(false);
        restoreRecordChrome();
      },
    });
    return () => {
      void stageRecorderRef.current?.stop();
      stageRecorderRef.current = null;
      restoreRecordChrome();
    };
  });

  const recordScreen = useCallback(async () => {
    const recorder = stageRecorderRef.current;
    if (!recorder) return;

    if (recorder.isRecording) {
      const blob = await recorder.stop();
      if (blob) downloadStageRecording(blob);
      setIsRecording(false);
      restoreRecordChrome();
      return;
    }

    const { screen, status } = store.getState();
    if (screen !== "app" || status !== "ready" || !stageRef.current) return;

    await prepareRecordChrome();
    recorder.start();
    if (!recorder.isRecording) {
      restoreRecordChrome();
      return;
    }
    setIsRecording(true);
  }, [prepareRecordChrome, restoreRecordChrome, store]);

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

  // prefs are cookie-seeded on the server; migrate any legacy localStorage values once.
  useMountEffect(() => {
    migrateLegacySimulatorPreferences(store);
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

  // additive preview is composited on the host inside #hud-display so black waveguide
  // pixels blend with the aligned backdrop slice before device chrome transforms.
  const syncHostAdditiveLayers = useCallback(() => {
    const {
      additive,
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
    additiveSyncKeyRef.current =
      syncHostAdditive(
        displayRef.current,
        additive,
        preset,
        geometry,
        backgroundBrightness,
        backgroundBlur,
        additiveSyncKeyRef.current,
      ) ?? additiveSyncKeyRef.current;
    clearIframeBodyBlend(iframeRef.current);
    syncDisplayBrightness(iframeRef.current, displayBrightness);
  }, [store]);

  syncHostAdditiveLayersRef.current = syncHostAdditiveLayers;

  const syncAdditive = useCallback(() => {
    settleAdditiveSync(syncHostAdditiveLayers);
  }, [syncHostAdditiveLayers]);

  useMountEffect(() => {
    const unsub = store.subscribe((state, prev) => {
      if (
        state.additive !== prev.additive ||
        state.background !== prev.background ||
        state.customBackgroundImages !== prev.customBackgroundImages ||
        state.activeCustomBackgroundId !== prev.activeCustomBackgroundId ||
        state.backgroundBrightness !== prev.backgroundBrightness ||
        state.backgroundBlur !== prev.backgroundBlur ||
        state.displayBrightness !== prev.displayBrightness
      ) {
        syncAdditive();
      }
    });

    syncAdditive();
    applyAdditiveRef.current = syncHostAdditiveLayers;
    return () => {
      applyAdditiveRef.current = () => {};
      unsub();
    };
  });

  useEffect(() => {
    if (!store.getState().additive) return;
    syncAdditive();
  }, [panZoom.transformRevision, panZoom.revealed, view, store, syncAdditive]);

  useMountEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const ro = new ResizeObserver(() => {
      if (store.getState().additive) syncAdditive();
    });
    ro.observe(stage);
    return () => ro.disconnect();
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
      urlInputRef,
      load,
      press,
      pressDown,
      pressUp,
      pressedIntents,
      captureDisplay,
      recordScreen,
      isRecording,
      setView,
      panZoom,
      syncAdditive,
    }),
    [
      store,
      load,
      press,
      pressDown,
      pressUp,
      pressedIntents,
      captureDisplay,
      recordScreen,
      isRecording,
      setView,
      panZoom,
      syncAdditive,
    ],
  );

  return (
    <SimulatorContext.Provider value={ctx}>
      <TooltipProvider delay={1000}>
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="sr-only sm:hidden">{SIMULATOR_TITLE}</h1>
          <AppHeader />

          <div
            className={cn(
              "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] px-2 pb-2",
              displayPanelOpen ? "gap-2 sm:grid-cols-[1fr_auto]" : "sm:grid-cols-1",
            )}
          >
            <DisplaySidebarColumn sidebarToolbar={<Toolbar variant="sidebar" />} />
            <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:col-start-1 sm:row-start-1 sm:grid-rows-1 sm:gap-0">
              <div
                ref={stageRef}
                className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-stage-fill"
              >
                <BackgroundBackdrop
                  ref={backdropRef}
                  preset={background}
                  placeholder={backdropPlaceholder}
                  backgroundBrightness={backgroundBrightness}
                  backgroundBlur={backgroundBlur}
                />
                <Device />
              </div>
              <div
                className={cn(
                  "flex w-full shrink-0 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-2.5 sm:z-20 sm:w-auto sm:row-start-1 sm:justify-center sm:px-4 sm:py-0",
                  dockToolbarOnDesktop && "sm:hidden",
                )}
              >
                <Toolbar variant="floaty" />
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </SimulatorContext.Provider>
  );
}
