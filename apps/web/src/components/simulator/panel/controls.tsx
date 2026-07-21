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
import { track } from "@/lib/analytics/track";

// Display panel: Zustand for live preview. Shareable scene fields (additive)
// also mirror to the URL once per toggle — not on every slider tick.
export function PanelContent() {
  const { store } = useSimulator();
  const additive = useSimulatorState((s) => s.additive);
  const backgroundBrightness = useSimulatorState((s) => s.backgroundBrightness);
  const backgroundBlur = useSimulatorState((s) => s.backgroundBlur);
  const displayBrightness = useSimulatorState((s) => s.displayBrightness);
  const [, setAdditiveParam] = useQueryState("additive", simulatorParsers.additive);

  return (
    <>
      <PanelSection title="Background">
        <BackgroundPicker />

        <PanelSlider
          id="bg-brightness"
          label="Background brightness"
          value={backgroundBrightness}
          onChange={(next) => store.getState().setBackgroundBrightness(next)}
        />

        <PanelSlider
          id="bg-blur"
          label="Background blur"
          value={backgroundBlur}
          onChange={(next) => store.getState().setBackgroundBlur(next)}
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
              onCheckedChange={(next) => {
                store.getState().setAdditive(next);
                void setAdditiveParam(next);
                track("simulator_additive_changed", { additive: next });
              }}
              aria-label="Display transparency"
            />
          </PanelRow>
        </PanelRowGroup>

        <PanelSlider
          id="display-brightness"
          label="Display brightness"
          value={displayBrightness}
          onChange={(next) => store.getState().setDisplayBrightness(next)}
        />
      </PanelSection>
    </>
  );
}
