"use client";

import { DEVICE_MODEL } from "@/lib/emulator/config";
import { UrlBar } from "@/components/emulator/url-bar";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ZoomControls } from "@/components/emulator/zoom-controls";

// emulator toolbar: device label pinned left, controls centered. the 1fr/auto/1fr grid
// keeps the controls centered regardless of the label width.
export function Subheader() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3">
      <div className="flex flex-col text-nowrap gap-1 sm:px-3">
        <span className="text-sm font-semibold leading-none">{DEVICE_MODEL}</span>
        <span className="text-sm font-medium text-muted-foreground leading-none">Emulator</span>
      </div>
      <div className="flex items-center gap-4">
        <UrlBar />
        <ViewSwitcher />
        <ZoomControls />
      </div>
    </div>
  );
}
