"use client";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EnvironmentPicker } from "@/components/emulator/environment-picker";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ZoomControls } from "@/components/emulator/zoom-controls";
import { useQueryState } from "nuqs";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { emulatorParsers } from "@/lib/emulator/search-params";

// display preview controls: view, zoom, and additive blend (shared by the rhs panel + mobile sheet).
export function DisplayPanel() {
  const { store } = useEmulator();
  const additive = useEmulatorState((s) => s.additive);
  const lensTint = useEmulatorState((s) => s.lensTint);
  const [, setAdditiveParam] = useQueryState("additive", emulatorParsers.additive);
  const [, setLensTintParam] = useQueryState("lensTint", emulatorParsers.lensTint);

  const setAdditive = (next: number) => {
    store.getState().setAdditive(next);
    void setAdditiveParam(next);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-2">
        <Label>View</Label>
        <ViewSwitcher />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="lens-tint">Lens tint</Label>
        <Switch
          id="lens-tint"
          checked={lensTint}
          onCheckedChange={(checked) => {
            store.getState().setLensTint(checked);
            void setLensTintParam(checked);
          }}
          aria-label="Lens tint"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Zoom</Label>
        <ZoomControls />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>Environment</Label>
        <EnvironmentPicker />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="additive-slider">Additive preview</Label>
          <span className="text-sm tabular-nums text-muted-foreground">{additive}%</span>
        </div>
        <Slider
          id="additive-slider"
          min={0}
          max={100}
          step={1}
          value={[additive]}
          onValueChange={(vals) => {
            const next = Array.isArray(vals) ? vals[0] : vals;
            if (next != null) setAdditive(next);
          }}
          aria-label="Additive preview strength"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Black reads transparent on the waveguide. Slide up to add the environment through the
          display.
        </p>
      </div>
    </div>
  );
}
