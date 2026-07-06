"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIEWS } from "@/lib/simulator/config";
import type { View } from "@/lib/simulator/store";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";

// swaps only the cosmetic chrome around the persistent device surface.
export function ViewSwitcher() {
  const { setView } = useSimulator();
  const view = useSimulatorState((s) => s.view);

  return (
    <ToggleGroup
      variant="outline"
      aria-label="Display mode"
      value={[view]}
      onValueChange={(vals) => {
        const next = vals[0];
        if (next) setView(next as View); // ignore deselect so a view is always active
      }}
      className="gap-0.5 rounded-xl border bg-muted p-0.5"
    >
      {VIEWS.map((v) => (
        <ToggleGroupItem
          key={v.key}
          value={v.key}
          onMouseDown={dropFocus}
          onClick={() => setView(v.key)}
          className="hover:bg-background/60 border-muted aria-pressed:bg-background! aria-pressed:border-border!"
        >
          {v.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
