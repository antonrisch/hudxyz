"use client";

import { useRef, type ChangeEvent, type MouseEvent } from "react";
import Image from "next/image";
import { ImagePlus, Moon, Sun, type LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { ENVIRONMENTS, type EnvironmentKey } from "@/lib/emulator/environment";
import { emulatorParsers } from "@/lib/emulator/search-params";

const dropFocus = (e: MouseEvent) => e.preventDefault();

const ENVIRONMENT_ICONS = {
  daylight: Sun,
  night: Moon,
} satisfies Partial<Record<EnvironmentKey, LucideIcon>>;

export function EnvironmentPicker() {
  const { store } = useEmulator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const environment = useEmulatorState((s) => s.environment);
  const customEnvironmentImage = useEmulatorState((s) => s.customEnvironmentImage);
  const [, setEnvironmentParam] = useQueryState("environment", emulatorParsers.environment);

  const setEnvironment = (next: EnvironmentKey) => {
    store.getState().setEnvironment(next);
    void setEnvironmentParam(next);
  };

  const applyCustomImage = (dataUrl: string) => {
    store.getState().setCustomEnvironmentImage(dataUrl);
    setEnvironment("custom");
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") applyCustomImage(result);
    });
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-0.5 rounded-xl border bg-muted p-0.5">
      <ToggleGroup
        variant="outline"
        aria-label="Environment"
        value={[environment]}
        onValueChange={(vals) => {
          const next = vals[0];
          if (!next) return;
          if (next === "custom" && !customEnvironmentImage) {
            fileInputRef.current?.click();
            return;
          }
          setEnvironment(next as EnvironmentKey);
        }}
        className="flex-wrap justify-end gap-0.5 border-0 bg-transparent p-0"
      >
        {ENVIRONMENTS.map((env) => {
          if (env.key === "custom" && !customEnvironmentImage) return null;

          const Icon = ENVIRONMENT_ICONS[env.key as keyof typeof ENVIRONMENT_ICONS];
          const customThumb = env.key === "custom" ? customEnvironmentImage : null;

          return (
            <ToggleGroupItem
              key={env.key}
              value={env.key}
              aria-label={env.label}
              onMouseDown={dropFocus}
              onClick={() => setEnvironment(env.key)}
              className="hover:bg-background/60 size-8 border-muted p-0 aria-pressed:border-border! aria-pressed:bg-background!"
            >
              {customThumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- data urls from user uploads
                <img
                  src={customThumb}
                  alt=""
                  className="size-full rounded-[inherit] object-cover"
                />
              ) : env.kind === "photo" && "image" in env && env.image ? (
                <Image
                  src={env.image}
                  alt=""
                  width={32}
                  height={32}
                  className="size-full rounded-[inherit] object-cover"
                />
              ) : Icon ? (
                <Icon className="size-4" />
              ) : null}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <label
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground"
        aria-label="Upload environment photo"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />
        <ImagePlus className="size-4" />
      </label>
    </div>
  );
}
