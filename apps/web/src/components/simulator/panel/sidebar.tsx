"use client";

import type { ReactNode } from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIMULATOR_TITLE } from "@/lib/simulator/config";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

// desktop rhs panel — hidden when closed (no width animation; avoids overflow scrollbars).
export function PanelSidebar({ children }: { children: ReactNode }) {
  const open = useSimulatorState((s) => s.displayPanelOpen);
  if (!open) return null;

  return (
    <div className="hidden min-h-0 w-66 overflow-hidden rounded-2xl border bg-background sm:col-start-2 sm:row-start-1 sm:flex sm:flex-col">
      <p className="shrink-0 p-3 pb-2 text-md leading-snug tracking-tight font-semibold">{SIMULATOR_TITLE}</p>
      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</aside>
    </div>
  );
}

export function PanelToggle() {
  const { store } = useSimulator();
  const open = useSimulatorState((s) => s.displayPanelOpen);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      aria-label={open ? "Hide display panel" : "Show display panel"}
      aria-pressed={open}
      onMouseDown={dropFocus}
      onClick={() => store.getState().toggleDisplayPanel()}
      className={cn("size-10 px-0", open && "bg-muted")}
    >
      <PanelRight />
    </Button>
  );
}
