"use client";

import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PanelRow,
  PanelRowGroup,
  PanelSection,
  PanelSlider,
} from "@/components/simulator/panel/fields";
import { BackgroundPicker } from "@/components/simulator/background/picker";
import { useQueryState } from "nuqs";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { simulatorParsers } from "@/lib/simulator/search-params";

function syncSimulatorParam<T>(
  apply: (next: T) => void,
  setParam: (value: T | null | ((old: T) => T | null)) => void | Promise<unknown>,
) {
  return (next: T) => {
    apply(next);
    void setParam(next);
  };
}

// display preview controls: view, zoom, and additive blend (shared by the rhs panel + mobile sheet).
export function DisplayPanel() {
  const { store } = useSimulator();
  const additive = useSimulatorState((s) => s.additive);
  const lensTint = useSimulatorState((s) => s.lensTint);
  const backgroundBrightness = useSimulatorState((s) => s.backgroundBrightness);
  const backgroundBlur = useSimulatorState((s) => s.backgroundBlur);
  const displayBrightness = useSimulatorState((s) => s.displayBrightness);
  const [, setAdditiveParam] = useQueryState("additive", simulatorParsers.additive);
  const [, setLensTintParam] = useQueryState("lensTint", simulatorParsers.lensTint);
  const [, setBgBrightnessParam] = useQueryState("bgBrightness", simulatorParsers.bgBrightness);
  const [, setBgBlurParam] = useQueryState("bgBlur", simulatorParsers.bgBlur);
  const [, setDisplayBrightnessParam] = useQueryState(
    "displayBrightness",
    simulatorParsers.displayBrightness,
  );

  const setAdditive = syncSimulatorParam(
    (next) => store.getState().setAdditive(next),
    setAdditiveParam,
  );
  const setBgBrightness = syncSimulatorParam(
    (next) => store.getState().setBackgroundBrightness(next),
    setBgBrightnessParam,
  );
  const setBgBlur = syncSimulatorParam(
    (next) => store.getState().setBackgroundBlur(next),
    setBgBlurParam,
  );
  const setDisplayBrightness = syncSimulatorParam(
    (next) => store.getState().setDisplayBrightness(next),
    setDisplayBrightnessParam,
  );
  const setLensTint = syncSimulatorParam(
    (next) => store.getState().setLensTint(next),
    setLensTintParam,
  );

  return (
    <>
      <PanelSection title="Background">
        <BackgroundPicker />

        <PanelSlider
          id="bg-brightness"
          label="Background brightness"
          value={backgroundBrightness}
          onChange={setBgBrightness}
        />

        <PanelSlider
          id="bg-blur"
          label="Background blur"
          value={backgroundBlur}
          onChange={setBgBlur}
        />
      </PanelSection>

      <Separator />

      <PanelSection title="Display">
        <PanelRowGroup compact>
          <PanelRow
            label="Display Transparency"
            htmlFor="additive"
            hint={
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
                  The display is additive — dark areas effectively disappear. Turn on to blend the
                  background into the preview.
                </TooltipContent>
              </Tooltip>
            }
          >
            <Switch
              id="additive"
              checked={additive}
              onCheckedChange={setAdditive}
              aria-label="Display transparency"
            />
          </PanelRow>

          <PanelRow label="Lens tint" htmlFor="lens-tint">
            <Switch
              id="lens-tint"
              checked={lensTint}
              onCheckedChange={setLensTint}
              aria-label="Lens tint"
            />
          </PanelRow>
        </PanelRowGroup>

        <PanelSlider
          id="display-brightness"
          label="Display brightness"
          value={displayBrightness}
          onChange={setDisplayBrightness}
        />
      </PanelSection>
    </>
  );
}
