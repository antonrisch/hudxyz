"use client";

import { Home, LayoutGrid, RotateCw } from "lucide-react";
import { Frames } from "@/components/frames";
import { DEVICE_BG, DEVICE_SURFACE, GLASSES_CHROME } from "@/lib/emulator/config";
import type { Status } from "@/lib/emulator/store";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";

const STATUS_MSG: Partial<Record<Status, string>> = {
  loading: "Loading…",
  error: "Couldn't load. Reload to retry.",
};

// the device as a pan/zoom canvas. the viewport clips; #hud-device is the content plane —
// always the bare 600×600 surface, laid out identically in every view (glasses just hangs
// the frames svg off it decoratively, so glasses ≡ 1:1 at a smaller default zoom). the
// iframe stays the same element across views/modes/zoom.
export function Device() {
  const { iframeRef, displayRef, panZoom, store } = useEmulator();
  const view = useEmulatorState((s) => s.view);
  const screen = useEmulatorState((s) => s.screen);
  const status = useEmulatorState((s) => s.status);
  const additive = useEmulatorState((s) => s.additive);
  const lensTint = useEmulatorState((s) => s.lensTint);
  const isGlasses = view === "glasses";

  return (
    <div ref={panZoom.viewportRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
      <div
        ref={panZoom.contentRef}
        id="hud-device"
        className={cn(
          "absolute left-0 top-0 size-150",
          panZoom.revealed ? "opacity-100" : "opacity-0",
          panZoom.revealed && "transition-opacity duration-200 ease-out",
        )}
        style={panZoom.style}
      >
        {isGlasses && (
          <Frames
            className="pointer-events-none absolute block"
            style={GLASSES_CHROME}
            lensClassName={lensTint ? "fill-canvas-frame-lens/25" : "fill-transparent"}
          />
        )}
        <div
          ref={displayRef}
          id="hud-display"
          className={cn(
            "relative z-10 size-full overflow-hidden rounded-lg",
            additive ? "bg-transparent" : DEVICE_SURFACE,
          )}
        >
          <iframe
            ref={iframeRef}
            title="Glasses display"
            allow="clipboard-read; clipboard-write"
            className="relative size-full border-0"
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

          {/* app load status */}
          {screen === "app" && (status === "loading" || status === "error") && (
            <div
              className={cn(
                "absolute inset-0 grid place-items-center px-2 text-center text-[10px] leading-tight",
                DEVICE_BG,
              )}
            >
              {STATUS_MSG[status]}
            </div>
          )}
        </div>
      </div>

      {/* capture overlay: the device takes no mouse input (d-pad only), so the cursor always
          drives the canvas. drag = pan; pinch / cmd-scroll = zoom (handled on the viewport). */}
      <div
        className={cn(
          "absolute inset-0 touch-none",
          screen === "app" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
        )}
        {...panZoom.bind()}
      />
    </div>
  );
}
