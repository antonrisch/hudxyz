"use client";

import type { MouseEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmulator } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

// canvas zoom: −, +, and a reset (shows the current %). mirrors the view-switcher pill.
export function ZoomControls() {
  const { panZoom } = useEmulator();

  return (
    <div className="flex items-center rounded-xl border bg-muted p-0.5">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        onMouseDown={dropFocus}
        onClick={panZoom.zoomOut}
        className="hover:bg-background/60"
      >
        <Minus />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        onMouseDown={dropFocus}
        onClick={panZoom.zoomIn}
        className="hover:bg-background/60"
      >
        <Plus />
      </Button>
      <button
        type="button"
        title="Reset zoom"
        aria-label="Reset zoom"
        onMouseDown={dropFocus}
        onClick={panZoom.reset}
        className="min-w-12 rounded-md px-1 text-center text-sm font-medium tabular-nums text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        {Math.round(panZoom.scale * 100)}%
      </button>
    </div>
  );
}
