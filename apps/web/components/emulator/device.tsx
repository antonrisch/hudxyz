"use client";

import { useCallback, useRef, useState } from "react";
import { Frames } from "@/components/frames";
import { SLOT, VIEWPORT } from "@/lib/emulator/config";
import type { Status } from "@/lib/emulator/store";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";

const STATUS_MSG: Partial<Record<Status, string>> = {
  loading: "Loading…",
  error: "Couldn't load. Reload to retry.",
};

// the persistent device surface. the view only changes the chrome/sizing around it;
// the iframe stays the same element (proxy stays attached) across views AND modes.
export function Device() {
  const { iframeRef } = useEmulator();
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

  const slot = SLOT[view];

  return (
    <div
      id="hud-device"
      className={cn(
        "relative w-full max-w-240",
        // fit: absorb the column's leftover height so the slot (h-full) has room to fill
        view === "fit" && "flex min-h-0 flex-1 items-center justify-center",
      )}
    >
      {view === "glasses" && <Frames className="block h-auto w-full" />}
      <div className={slot.className} style={slot.style}>
        {/* 600×600 surface scaled to fit; the iframe stays mounted so the controller frame
            can attach to it. the os + status overlays sit on top of the same surface. */}
        <div ref={fitRef} className="relative size-full overflow-hidden bg-black">
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: VIEWPORT, height: VIEWPORT, transform: `scale(${scale})` }}
          >
            <iframe
              ref={iframeRef}
              title="Glasses display"
              allow="clipboard-read; clipboard-write"
              className="size-full border-0 bg-black"
            />
          </div>

          {/* baby mrbd os mounts here when the device exits an app (mode==='os'); stub for now.
              opaque, so the proxied iframe persists underneath while the os is shown. */}
          {mode === "os" && (
            <div className="absolute inset-0 grid place-items-center bg-black text-center text-xs text-white/60">
              hudbox os
            </div>
          )}

          {/* app load status overlay until the navigation is ready */}
          {mode === "app" && (status === "loading" || status === "error") && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 px-2 text-center text-[10px] leading-tight text-white/70">
              {STATUS_MSG[status]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
