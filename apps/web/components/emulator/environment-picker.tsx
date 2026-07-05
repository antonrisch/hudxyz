"use client";

import { useRef, type ChangeEvent, type MouseEvent } from "react";
import { ImagePlus, Moon, Sun, type LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { ENVIRONMENTS, type EnvironmentKey } from "@/lib/emulator/environment";
import { prepareCustomEnvironmentImage } from "@/lib/emulator/environment-image";
import { emulatorParsers } from "@/lib/emulator/search-params";

const dropFocus = (e: MouseEvent) => e.preventDefault();

const ENVIRONMENT_ICONS = {
  daylight: Sun,
  night: Moon,
} satisfies Partial<Record<EnvironmentKey, LucideIcon>>;

const customToggleValue = (id: string) => `custom:${id}`;

export function EnvironmentPicker() {
  const { store } = useEmulator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const environment = useEmulatorState((s) => s.environment);
  const customEnvironmentImages = useEmulatorState((s) => s.customEnvironmentImages);
  const activeCustomEnvironmentId = useEmulatorState((s) => s.activeCustomEnvironmentId);
  const [, setEnvironmentParam] = useQueryState("environment", emulatorParsers.environment);

  const selected =
    environment === "custom" && activeCustomEnvironmentId
      ? customToggleValue(activeCustomEnvironmentId)
      : environment;

  const setPresetEnvironment = (next: EnvironmentKey) => {
    store.getState().setEnvironment(next);
    void setEnvironmentParam(next);
  };

  const selectCustom = (id: string) => {
    store.getState().selectCustomEnvironment(id);
    void setEnvironmentParam("custom");
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    void prepareCustomEnvironmentImage(file)
      .then((url) => {
        store.getState().addCustomEnvironment(url);
        void setEnvironmentParam("custom");
      })
      .catch(() => {
        // decode/resize failed — ignore and keep the current environment.
      });
  };

  return (
    <div className="flex flex-wrap items-center justify-start gap-1 rounded-xl border bg-muted p-1">
      <ToggleGroup
        variant="outline"
        aria-label="Environment"
        value={[selected]}
        onValueChange={(vals) => {
          const next = vals[0];
          if (!next) return;
          if (next.startsWith("custom:")) {
            selectCustom(next.slice("custom:".length));
            return;
          }
          setPresetEnvironment(next as EnvironmentKey);
        }}
        className="flex-wrap justify-start gap-1 border-0 bg-transparent p-0"
      >
        {ENVIRONMENTS.filter((env) => env.key !== "custom").map((env) => {
          const Icon = ENVIRONMENT_ICONS[env.key as keyof typeof ENVIRONMENT_ICONS];
          return (
            <ToggleGroupItem
              key={env.key}
              value={env.key}
              aria-label={env.label}
              onMouseDown={dropFocus}
              onClick={() => setPresetEnvironment(env.key)}
              className="hover:bg-background/60 size-12 border-muted p-0 aria-pressed:border-border! aria-pressed:bg-background!"
            >
              {"image" in env && env.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- same-origin preset thumbnail
                <img src={env.image} alt="" className="size-full rounded-[inherit] object-cover" />
              ) : Icon ? (
                <Icon className="size-6" />
              ) : null}
            </ToggleGroupItem>
          );
        })}

        {customEnvironmentImages.map((img) => (
          <ToggleGroupItem
            key={img.id}
            value={customToggleValue(img.id)}
            aria-label="Custom environment"
            onMouseDown={dropFocus}
            onClick={() => selectCustom(img.id)}
            className="hover:bg-background/60 size-12 border-muted p-0 aria-pressed:border-border! aria-pressed:bg-background!"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- session blob urls */}
            <img src={img.url} alt="" className="size-full rounded-[inherit] object-cover" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <label
        className="inline-flex size-12 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground"
        aria-label="Upload environment photo"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />
        <ImagePlus className="size-6" />
      </label>
    </div>
  );
}
