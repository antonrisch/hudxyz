"use client";

import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EnvironmentPicker } from "@/components/emulator/environment-picker";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ZoomControls } from "@/components/emulator/zoom-controls";
import { useQueryState } from "nuqs";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { DEVICE_MODEL } from "@/lib/emulator/config";
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
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-3">
        <div className="text-md leading-snug">
          <p className="font-semibold">{DEVICE_MODEL}</p>
          <p className="text-sm font-medium text-muted-foreground">Emulator</p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Mode</Label>
          <ViewSwitcher />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label>Zoom</Label>
          <ZoomControls />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="lens-tint">Lens tint</Label>
          <div className="flex h-9 items-center">
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
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Environment</Label>
          <EnvironmentPicker />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="additive-slider">Display Transparency</Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="About display transparency"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent className="max-w-56 text-pretty">
                  Black reads transparent on the waveguide. Slide up to add the environment through
                  the display.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">{additive}%</span>
          </div>
          <Slider
            id="additive-slider"
            value={[additive]}
            onValueChange={(vals) => {
              const next = Array.isArray(vals) ? vals[0] : vals;
              if (next != null) setAdditive(next);
            }}
            aria-label="Display transparency"
          />
        </div>
      </div>
    </div>
  );
}
