"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Home, LayoutGrid, RotateCw } from "lucide-react";
import { Frames } from "@/components/frames";
import {
  DEVICE_BG,
  DEVICE_SURFACE,
  FRAMES_STAGE_UNITS,
  LENS_SLOT,
  VIEWPORT,
} from "@/lib/emulator/config";
import type { Status } from "@/lib/emulator/store";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";

const STATUS_MSG: Partial<Record<Status, string>> = {
  loading: "Loading…",
  error: "Couldn't load. Reload to retry.",
};

// the device as a pan/zoom canvas. the viewport clips; #hud-device is the content plane
// (the glasses frame, or the bare 600 surface) pinned at the viewport top-left and
// transformed by usePanZoom. the iframe stays the same element across views/modes/zoom.
export function Device() {
  const { iframeRef, displayRef, panZoom, store } = useEmulator();
  const view = useEmulatorState((s) => s.view);
  const screen = useEmulatorState((s) => s.screen);
  const status = useEmulatorState((s) => s.status);
  const slotRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const isGlasses = view === "glasses";

  // measure the lens slot and scale the fixed 600×600 surface to fill it — synchronously
  // before paint so the display doesn't flash at scale(1) inside the percentage-sized slot.
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    if (!isGlasses) {
      setScale(1);
      return;
    }

    const update = () => {
      const w = el.clientWidth;
      if (w) setScale(w / VIEWPORT);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isGlasses]);

  return (
    <div
      ref={panZoom.viewportRef}
      className="relative min-h-0 w-full flex-1 overflow-hidden"
    >
      <div
        ref={panZoom.contentRef}
        id="hud-device"
        className={cn(
          "absolute left-0 top-0",
          !isGlasses && "size-150",
          panZoom.revealed ? "opacity-100" : "opacity-0",
          panZoom.revealed && "transition-opacity duration-200 ease-out",
        )}
        style={{
          ...panZoom.style,
          ...(isGlasses ? { width: `calc(var(--spacing) * ${FRAMES_STAGE_UNITS})` } : undefined),
        }}
      >
        {isGlasses && <Frames className="block h-auto w-full" />}
        {/* device surface: the 600×600 plane scaled to fit; the iframe stays mounted so the
            controller frame can attach. black + rounded shows whenever an app isn't covering it.
            os + status overlays sit on top of the same surface. */}
        <div
          ref={slotRef}
          className={cn(DEVICE_SURFACE, isGlasses ? "absolute" : "relative size-full")}
          style={isGlasses ? LENS_SLOT : undefined}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `scale(${scale})` }}
          >
            <div
              ref={displayRef}
              id="hud-display"
              className={cn("relative", DEVICE_BG)}
              style={{ width: VIEWPORT, height: VIEWPORT }}
            >
              <iframe
                ref={iframeRef}
                title="Glasses display"
                allow="clipboard-read; clipboard-write"
                className="size-full border-0"
              />
            </div>
          </div>

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
        {...panZoom.bind}
      />
    </div>
  );
}
