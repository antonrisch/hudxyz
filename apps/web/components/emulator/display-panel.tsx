"use client";

import { Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PanelField,
  PanelRow,
  PanelRowGroup,
  PanelSection,
  PanelSlider,
} from "@/components/emulator/display-panel-fields";
import { EnvironmentPicker } from "@/components/emulator/environment-picker";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ZoomControls } from "@/components/emulator/zoom-controls";
import { useQueryState } from "nuqs";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { DEVICE_MODEL } from "@/lib/emulator/config";
import { emulatorParsers } from "@/lib/emulator/search-params";

export function DisplayPanelHeader() {
  return (
    <div className="shrink-0">
      <h2 className="px-3 py-2.5 text-md leading-snug font-semibold">{DEVICE_MODEL} Emulator</h2>
      <Separator />
    </div>
  );
}

// display preview controls: view, zoom, and additive blend (shared by the rhs panel + mobile sheet).
export function DisplayPanel() {
  const { store } = useEmulator();
  const additive = useEmulatorState((s) => s.additive);
  const lensTint = useEmulatorState((s) => s.lensTint);
  const backgroundBrightness = useEmulatorState((s) => s.backgroundBrightness);
  const backgroundBlur = useEmulatorState((s) => s.backgroundBlur);
  const displayBrightness = useEmulatorState((s) => s.displayBrightness);
  const [, setAdditiveParam] = useQueryState("additive", emulatorParsers.additive);
  const [, setLensTintParam] = useQueryState("lensTint", emulatorParsers.lensTint);
  const [, setBgBrightnessParam] = useQueryState("bgBrightness", emulatorParsers.bgBrightness);
  const [, setBgBlurParam] = useQueryState("bgBlur", emulatorParsers.bgBlur);
  const [, setDisplayBrightnessParam] = useQueryState(
    "displayBrightness",
    emulatorParsers.displayBrightness,
  );

  const setAdditive = (next: boolean) => {
    store.getState().setAdditive(next);
    void setAdditiveParam(next);
  };

  return (
    <div className="flex flex-col">
      <PanelSection title="Environment">
        <PanelField label="Background">
          <EnvironmentPicker />
        </PanelField>

        <PanelSlider
          id="bg-brightness"
          label="Background brightness"
          value={backgroundBrightness}
          onChange={(next) => {
            store.getState().setBackgroundBrightness(next);
            void setBgBrightnessParam(next);
          }}
        />

        <PanelSlider
          id="bg-blur"
          label="Background blur"
          value={backgroundBlur}
          onChange={(next) => {
            store.getState().setBackgroundBlur(next);
            void setBgBlurParam(next);
          }}
        />
      </PanelSection>

      <Separator />

      <PanelSection title="Appearance">
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
                  environment into the preview.
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
              onCheckedChange={(checked) => {
                store.getState().setLensTint(checked);
                void setLensTintParam(checked);
              }}
              aria-label="Lens tint"
            />
          </PanelRow>
        </PanelRowGroup>

        <PanelSlider
          id="display-brightness"
          label="Display brightness"
          value={displayBrightness}
          onChange={(next) => {
            store.getState().setDisplayBrightness(next);
            void setDisplayBrightnessParam(next);
          }}
        />
      </PanelSection>

      <Separator />

      <PanelSection title="Device">
        <PanelRowGroup>
          <PanelRow label="Mode">
            <ViewSwitcher />
          </PanelRow>

          <PanelRow label="Zoom">
            <ZoomControls />
          </PanelRow>
        </PanelRowGroup>
      </PanelSection>
    </div>
  );
}
