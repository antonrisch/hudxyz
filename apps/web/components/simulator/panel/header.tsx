"use client";

import { Separator } from "@/components/ui/separator";
import { ViewSwitcher } from "@/components/simulator/panel/view-switcher";
import { ZoomControls } from "@/components/simulator/panel/zoom-controls";
import { cn } from "@/lib/utils";

export function PanelHeader({ className }: { className?: string }) {
  return (
    <div className="shrink-0">
      <div className={cn("flex items-center justify-between gap-2 px-3 pb-2.5", className)}>
        <ViewSwitcher />
        <ZoomControls className="hidden sm:flex" />
      </div>
      <Separator />
    </div>
  );
}
