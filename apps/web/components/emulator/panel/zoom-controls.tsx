"use client";

import { useState, type KeyboardEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmulator } from "@/components/emulator";
import { dropFocus } from "@/lib/emulator/input";
import { ButtonGroup } from "@/components/ui/button-group";

// canvas zoom: −, +, and an editable percentage. mirrors the view-switcher pill.
export function ZoomControls() {
  const { panZoom } = useEmulator();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const percent = Math.round(panZoom.scale * 100);

  const commitZoom = (raw: string) => {
    setEditing(false);
    setDraft("");
    const next = Number.parseFloat(raw.replace("%", "").trim());
    if (Number.isFinite(next)) panZoom.zoomTo(next / 100);
  };

  const handleZoomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Escape") {
      setEditing(false);
      setDraft("");
    }
  };

  return (
    <div className="flex items-center rounded-xl border border-border/50 p-0.5 bg-muted">
      <ButtonGroup>
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
      </ButtonGroup>
      <input
        data-slot="zoom-input"
        aria-label="Zoom percentage"
        inputMode="decimal"
        value={editing ? draft : `${percent}%`}
        onFocus={(e) => {
          setEditing(true);
          setDraft(String(percent));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commitZoom(e.target.value)}
        onKeyDown={handleZoomKeyDown}
        className="ml-1 h-8 w-10 rounded-md bg-transparent text-center text-sm font-medium tabular-nums text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      />
    </div>
  );
}
