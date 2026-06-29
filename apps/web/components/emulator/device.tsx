"use client";

import { useCallback, useRef, useState } from "react";
import { Frames } from "@/components/frames";
import { DEVICE_BG, DEVICE_SURFACE, LENS_SLOT, VIEWPORT } from "@/lib/emulator/config";
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
  const { iframeRef, panZoom } = useEmulator();
  const view = useEmulatorState((s) => s.view);
  const mode = useEmulatorState((s) => s.mode);
  const status = useEmulatorState((s) => s.status);
  const [scale, setScale] = useState(1);
  const roRef = useRef<ResizeObserver | null>(null);

  // measure the slot and scale the fixed 600×600 surface to fill it
  const fitRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / VIEWPORT));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const isGlasses = view === "glasses";

  return (
    <div ref={panZoom.viewportRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
      <div
        ref={panZoom.contentRef}
        id="hud-device"
        className={cn("absolute left-0 top-0", isGlasses ? "w-240" : "size-150")}
        style={panZoom.style}
      >
        {isGlasses && <Frames className="block h-auto w-full" />}
        {/* device surface: the 600×600 plane scaled to fit; the iframe stays mounted so the
            controller frame can attach. black + rounded shows whenever an app isn't covering it.
            os + status overlays sit on top of the same surface. */}
        <div
          ref={fitRef}
          className={cn(
            DEVICE_SURFACE,
            isGlasses ? "absolute" : "relative size-full rounded-xl",
          )}
          style={isGlasses ? LENS_SLOT : undefined}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: VIEWPORT, height: VIEWPORT, transform: `scale(${scale})` }}
          >
            <iframe
              ref={iframeRef}
              title="Glasses display"
              allow="clipboard-read; clipboard-write"
              className={cn("size-full border-0", DEVICE_BG)}
            />
          </div>

          {mode === "os" && (
            <div
              className={cn("absolute inset-0 grid place-items-center text-center text-xs", DEVICE_BG)}
            >
              hudbox os
            </div>
          )}

          {mode === "app" && (status === "loading" || status === "error") && (
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
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        {...panZoom.bind}
      />
    </div>
  );
}
