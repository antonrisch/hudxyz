"use client";

import { useCallback, useEffect, useState } from "react";
import { Home, LayoutGrid, RotateCw } from "lucide-react";
import { Frames } from "@/components/simulator/frames";
import {
  DEVICE_OVERLAY,
  DEVICE_OVERLAY_TEXT,
  DEVICE_SURFACE,
  GLASSES_CHROME,
} from "@/lib/simulator/config";
import type { Status } from "@/lib/simulator/store";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { releaseChromeFocus } from "@/lib/simulator/input";
import { BackdropPhoto, BackdropVideo } from "@/components/simulator/background/backdrop-media";
import { additiveBackdropContentStyle, additiveSliceStyle } from "@/lib/simulator/additive";
import { resolveBackground, resolveBackdropPlaceholder } from "@/lib/simulator/background";
import { cn } from "@/lib/utils";
import { useMountEffect } from "@/lib/use-mount-effect";

const STATUS_MSG: Partial<Record<Status, string>> = {
  loading: "Loading app…",
  error: "Couldn't load. Reload to retry.",
};

const WELCOME_MSG = "Enter a URL to get started";

const APP_REVEAL_MS = 300;

// the device as a pan/zoom canvas. the viewport clips; #hud-device is the content plane —
// always the bare 600×600 surface, laid out identically in every view (glasses just hangs
// the frames svg off it decoratively, so glasses ≡ 1:1 at a smaller default zoom). the
// iframe stays the same element across views/modes/zoom.
export function Device() {
  const { iframeRef, displayRef, panZoom, store, urlInputRef, syncAdditive, isRecording } =
    useSimulator();
  const view = useSimulatorState((s) => s.view);
  const screen = useSimulatorState((s) => s.screen);
  const status = useSimulatorState((s) => s.status);
  const additive = useSimulatorState((s) => s.additive);
  const backgroundKey = useSimulatorState((s) => s.background);
  const customBackgroundImages = useSimulatorState((s) => s.customBackgroundImages);
  const activeCustomBackgroundId = useSimulatorState((s) => s.activeCustomBackgroundId);
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
  // Photo + video share one additive layout: media in #hud-display, overflow to stage.
  const additiveMedia = Boolean(additive && (background.video || background.image));
  const isGlasses = view === "glasses";
  const panGesture = panZoom.bind();
  const [appRevealed, setAppRevealed] = useState(false);

  const setDisplayNode = useCallback(
    (node: HTMLDivElement | null) => {
      displayRef.current = node;
      if (node) syncAdditive();
    },
    [displayRef, syncAdditive],
  );

  useMountEffect(() => {
    const display = displayRef.current;
    if (!display) return;

    const ro = new ResizeObserver(() => {
      if (store.getState().additive) syncAdditive();
    });
    ro.observe(display);
    return () => ro.disconnect();
  });

  useEffect(() => {
    if (status === "loading") setAppRevealed(false);
    if (status !== "revealing") return;
    const id = requestAnimationFrame(() => setAppRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [status]);

  useEffect(() => {
    if (status !== "revealing" || !appRevealed) return;
    const id = window.setTimeout(() => {
      if (store.getState().status === "revealing") store.getState().appReady();
    }, APP_REVEAL_MS + 50);
    return () => window.clearTimeout(id);
  }, [status, appRevealed, store]);

  const showLoadOverlay =
    screen === "app" && (status === "loading" || status === "revealing" || status === "error");
  const showWelcome = screen === "app" && status === "idle";
  const appVisible = status === "revealing" || status === "ready";

  const focusUrlBar = () => urlInputRef.current?.focus();

  return (
    <div ref={panZoom.viewportRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
      <div
        ref={panZoom.contentRef}
        id="hud-device"
        className="absolute left-0 top-0 size-150 will-change-transform opacity-0 transition-opacity duration-200 ease-out"
      >
        {isGlasses && (
          <Frames
            // Above the additive video when it overflows the display to cover the stage.
            className="pointer-events-none absolute z-20 block"
            style={GLASSES_CHROME}
          />
        )}
        <div
          ref={setDisplayNode}
          id="hud-display"
          className={cn(
            // DEVICE_SURFACE includes overflow-hidden; override after so additive media
            // can paint the stage-sized slice outside the 600×600 waveguide.
            DEVICE_SURFACE,
            "relative z-10 size-full",
            additiveMedia ? "overflow-visible" : "overflow-hidden",
            additive && "bg-transparent",
          )}
        >
          {additive && (
            <div
              aria-hidden
              data-additive-slice
              data-capture={additiveMedia ? "backdrop" : undefined}
              className={cn("relative", additiveMedia ? "overflow-visible" : "overflow-hidden")}
              style={additiveSliceStyle()}
            >
              {background.video ? (
                <BackdropVideo
                  src={background.video}
                  poster={background.poster}
                  placeholder={backdropPlaceholder}
                  keepPlaying={isRecording}
                  showPlaceholder={false}
                  overscale={false}
                />
              ) : background.image ? (
                <BackdropPhoto
                  src={background.image}
                  placeholder={backdropPlaceholder}
                  showPlaceholder={false}
                  overscale={false}
                />
              ) : (
                <div
                  className="absolute inset-0 origin-center"
                  style={additiveBackdropContentStyle(background)}
                />
              )}
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="Glasses display"
            tabIndex={-1}
            allow="clipboard-read; clipboard-write"
            className={cn(
              // Round the app surface only — additive bg overflows square past this.
              "relative z-10 size-full rounded-3xl border-0 transition-opacity ease-out",
              additive && "mix-blend-screen",
              appVisible && appRevealed ? "opacity-100" : "opacity-0",
              showWelcome && "pointer-events-none",
            )}
            style={{ transitionDuration: `${APP_REVEAL_MS}ms` }}
          />

          {/* settings: a blurred control overlay over the running app */}
          {screen === "settings" && (
            <div className="absolute inset-0 flex flex-col justify-end bg-background/10 backdrop-blur-md">
              <div className="flex justify-center gap-2 p-3">
                {[
                  { Icon: RotateCw, label: "Reload", onClick: () => store.getState().reload() },
                  { Icon: Home, label: "Home", onClick: () => store.getState().setScreen("home") },
                  {
                    Icon: LayoutGrid,
                    label: "Apps",
                    onClick: () => store.getState().setScreen("apps"),
                  },
                ].map(({ Icon, label, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className="grid size-9 place-items-center rounded-full border bg-background/80"
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* baby-os screens (stubs for now) */}
          {(screen === "home" || screen === "apps") && (
            <div className="absolute inset-0 grid place-items-center bg-background text-sm font-medium capitalize">
              {screen}
            </div>
          )}

          {/* empty state — no app navigated yet */}
          {showWelcome && (
            <button
              type="button"
              onClick={focusUrlBar}
              className={cn(
                "absolute inset-0 grid cursor-pointer place-items-center rounded-3xl px-4 text-center",
                DEVICE_OVERLAY,
              )}
            >
              <p className={DEVICE_OVERLAY_TEXT}>{WELCOME_MSG}</p>
            </button>
          )}

          {/* app load overlay — stays up through revealing, then cross-fades out */}
          {showLoadOverlay && (
            <div
              className={cn(
                "absolute inset-0 grid place-items-center rounded-3xl px-4 text-center transition-opacity ease-out",
                DEVICE_OVERLAY,
                status === "revealing" && appRevealed
                  ? "pointer-events-none opacity-0"
                  : "opacity-100",
              )}
              style={{ transitionDuration: `${APP_REVEAL_MS}ms` }}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "opacity" || status !== "revealing" || !appRevealed) return;
                store.getState().appReady();
              }}
            >
              {status !== "revealing" && (
                <p className={DEVICE_OVERLAY_TEXT}>{STATUS_MSG[status]}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* capture overlay: drag = pan; pinch / cmd-scroll = zoom (Pointer Events). */}
      <div
        className={cn(
          "absolute inset-0 touch-none",
          (showWelcome || screen !== "app") && "pointer-events-none",
          screen === "app" && !showWelcome && "cursor-grab active:cursor-grabbing",
        )}
        {...panGesture}
        onPointerDown={(e) => {
          releaseChromeFocus();
          panGesture.onPointerDown(e);
        }}
      />
    </div>
  );
}
