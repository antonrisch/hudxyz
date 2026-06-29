"use client";

import type { MouseEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmulator } from "@/components/emulator";
import { ButtonGroup } from "@/components/ui/button-group";

const dropFocus = (e: MouseEvent) => e.preventDefault();

// canvas zoom: −, +, and a reset (shows the current %). mirrors the view-switcher pill.
export function ZoomControls() {
  const { panZoom } = useEmulator();

  return (
    <ButtonGroup className="flex items-center rounded-xl border border-border/50 p-0.5 bg-muted">
      <Button
        variant="outline"
        size="icon"
        aria-label="Zoom out"
        onMouseDown={dropFocus}
        onClick={panZoom.zoomOut}
        className="hover:bg-background/60"
      >
        <ZoomOut />
      </Button>

      <Button
        variant="outline"
        size="icon"
        aria-label="Zoom in"
        onMouseDown={dropFocus}
        onClick={panZoom.zoomIn}
        className="hover:bg-background/60"
      >
        <ZoomIn />
      </Button>
      <button
        type="button"
        title="Reset zoom"
        aria-label="Reset zoom"
        onMouseDown={dropFocus}
        onClick={panZoom.reset}
        className="min-w-12 rounded-md ml-1 px-1 text-center text-sm font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
      >
        {Math.round(panZoom.scale * 100)}%
      </button>
    </ButtonGroup>
  );
}
