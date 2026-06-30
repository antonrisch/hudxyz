"use client";

import type { MouseEvent } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIEWS } from "@/lib/emulator/config";
import type { View } from "@/lib/emulator/store";
import { useEmulator, useEmulatorState } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

// swaps only the cosmetic chrome around the persistent device surface.
export function ViewSwitcher() {
  const { setView } = useEmulator();
  const view = useEmulatorState((s) => s.view);

  return (
    <ToggleGroup
      variant="outline"
      aria-label="Display view"
      value={[view]}
      onValueChange={(vals) => {
        const next = vals[0];
        if (next) setView(next as View); // ignore deselect so a view is always active
      }}
      className="p-0.5 gap-1 border rounded-xl bg-muted"
    >
      {VIEWS.map((v) => (
        <ToggleGroupItem
          key={v.key}
          value={v.key}
          onMouseDown={dropFocus}
          className="px-4 hover:bg-background/60 border-muted aria-pressed:bg-background! aria-pressed:border-border!"
        >
          {v.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
