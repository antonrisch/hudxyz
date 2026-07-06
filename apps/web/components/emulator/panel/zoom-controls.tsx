"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useEmulator } from "@/components/emulator";
import { dropFocus } from "@/lib/emulator/input";

function ZoomMenuItem({
  label,
  shortcut,
  onSelect,
}: {
  label: string;
  shortcut?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem className="justify-between px-2 py-1.5" onClick={onSelect}>
      {label}
      {shortcut}
    </DropdownMenuItem>
  );
}

// zoom dropdown: editable percentage, presets, and keyboard shortcuts.
export function ZoomControls() {
  const { panZoom } = useEmulator();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const percent = Math.round(panZoom.scale * 100);

  const commitZoom = (raw: string, close = false) => {
    setEditing(false);
    setDraft("");
    const next = Number.parseFloat(raw.replace("%", "").trim());
    if (Number.isFinite(next)) panZoom.zoomTo(next / 100);
    if (close) setOpen(false);
  };

  const handleZoomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitZoom(editing ? draft : String(percent), true);
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Escape") {
      setEditing(false);
      setDraft("");
      setOpen(false);
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEditing(false);
          setDraft("");
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="lg"
            aria-label="Zoom"
            onMouseDown={dropFocus}
            className="h-10 gap-1 px-2 tabular-nums"
          >
            {percent}%
            <ChevronDown className="size-3.5 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup
          onPointerDown={(e) => e.preventDefault()}
          onPointerUp={(e) => e.stopPropagation()}
          className="p-1"
        >
          <Input
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
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ZoomMenuItem
            label="Zoom in"
            shortcut={
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>+</Kbd>
              </KbdGroup>
            }
            onSelect={panZoom.zoomIn}
          />
          <ZoomMenuItem
            label="Zoom out"
            shortcut={
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>−</Kbd>
              </KbdGroup>
            }
            onSelect={panZoom.zoomOut}
          />
          <ZoomMenuItem label="Zoom to 50%" onSelect={() => panZoom.zoomTo(0.5)} />
          <ZoomMenuItem
            label="Zoom to 100%"
            shortcut={
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>0</Kbd>
              </KbdGroup>
            }
            onSelect={() => panZoom.zoomTo(1)}
          />
          <ZoomMenuItem label="Zoom to 200%" onSelect={() => panZoom.zoomTo(2)} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
