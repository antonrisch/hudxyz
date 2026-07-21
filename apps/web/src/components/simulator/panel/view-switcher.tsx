"use client";

import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIEWS } from "@/lib/simulator/config";
import type { View } from "@/lib/simulator/store";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";

function nextView(current: View): View {
  const index = VIEWS.findIndex((v) => v.key === current);
  return VIEWS[(index + 1) % VIEWS.length]!.key;
}

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
        if (next) setView(next as View, { surface: "panel" }); // ignore deselect so a view is always active
      }}
    >
      {VIEWS.map((v) => (
        <ToggleGroupItem
          key={v.key}
          value={v.key}
          onMouseDown={dropFocus}
          onClick={() => setView(v.key, { surface: "panel" })}
        >
          {v.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// mobile shortcut: one tap cycles cosmetic chrome (same as ViewSwitcher).
export function ViewToggleButton() {
  const { setView } = useSimulator();
  const view = useSimulatorState((s) => s.view);
  const next = nextView(view);
  const nextLabel = VIEWS.find((v) => v.key === next)!.label;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={`Switch to ${nextLabel}`}
      onMouseDown={dropFocus}
      onClick={() => setView(next, { surface: "mobile_toolbar" })}
      className="shrink-0"
    >
      <ArrowLeftRight />
    </Button>
  );
}
