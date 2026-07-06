"use client";

import { useRef, type ChangeEvent } from "react";
import { ImagePlus, Moon, Sun, type LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";
import {
  BACKGROUND_GRADIENT,
  BACKGROUND_GRADIENT_FILL,
  BACKGROUNDS,
  type BackgroundKey,
} from "@/lib/emulator/background";
import { prepareCustomBackgroundImage } from "@/lib/emulator/background-image";
import { emulatorParsers } from "@/lib/emulator/search-params";
import { dropFocus } from "@/lib/emulator/input";

const BACKGROUND_ICONS = {
  day: Sun,
  night: Moon,
} satisfies Partial<Record<BackgroundKey, LucideIcon>>;

const customToggleValue = (id: string) => `custom:${id}`;

const selectedItemClass =
  "aria-pressed:border-white! aria-pressed:bg-transparent! aria-pressed:ring-[3px] aria-pressed:ring-white/50";

export function BackgroundPicker() {
  const { store } = useEmulator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const background = useEmulatorState((s) => s.background);
  const customBackgroundImages = useEmulatorState((s) => s.customBackgroundImages);
  const activeCustomBackgroundId = useEmulatorState((s) => s.activeCustomBackgroundId);
  const [, setBackgroundParam] = useQueryState("bg", emulatorParsers.bg);

  const selected =
    background === "custom" && activeCustomBackgroundId
      ? customToggleValue(activeCustomBackgroundId)
      : background;

  const setPresetBackground = (next: BackgroundKey) => {
    store.getState().setBackground(next);
    void setBackgroundParam(next);
  };

  const selectCustom = (id: string) => {
    store.getState().selectCustomBackground(id);
    void setBackgroundParam("custom");
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    void prepareCustomBackgroundImage(file)
      .then((url) => {
        store.getState().addCustomBackground(url);
        void setBackgroundParam("custom");
      })
      .catch(() => {
        // decode/resize failed — ignore and keep the current background.
      });
  };

  return (
    <div className="flex flex-wrap items-center justify-start gap-1 rounded-xl border bg-muted p-1">
      <ToggleGroup
        variant="outline"
        aria-label="Background"
        value={[selected]}
        onValueChange={(vals) => {
          const next = vals[0];
          if (!next) return;
          if (next.startsWith("custom:")) {
            selectCustom(next.slice("custom:".length));
            return;
          }
          setPresetBackground(next as BackgroundKey);
        }}
        className="flex-wrap justify-start gap-1 border-0 bg-transparent p-0"
      >
        {BACKGROUNDS.filter((bg) => bg.key !== "custom").map((bg) => {
          const Icon = BACKGROUND_ICONS[bg.key as keyof typeof BACKGROUND_ICONS];
          const gradient = BACKGROUND_GRADIENT[bg.key as keyof typeof BACKGROUND_GRADIENT];
          return (
            <ToggleGroupItem
              key={bg.key}
              value={bg.key}
              aria-label={bg.label}
              onMouseDown={dropFocus}
              onClick={() => setPresetBackground(bg.key)}
              style={
                gradient
                  ? {
                      backgroundColor:
                        BACKGROUND_GRADIENT_FILL[bg.key as keyof typeof BACKGROUND_GRADIENT_FILL],
                    }
                  : undefined
              }
              className={cn(
                "relative size-12 overflow-hidden border-0 p-0",
                selectedItemClass,
                gradient
                  ? "text-white hover:bg-transparent! hover:brightness-110"
                  : "border border-muted hover:bg-background/60",
              )}
            >
              {gradient ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-1"
                  style={{
                    backgroundColor:
                      BACKGROUND_GRADIENT_FILL[bg.key as keyof typeof BACKGROUND_GRADIENT_FILL],
                    backgroundImage: gradient,
                  }}
                />
              ) : null}
              {"image" in bg && bg.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- same-origin preset thumbnail
                <img src={bg.image} alt="" className="size-full rounded-[inherit] object-cover" />
              ) : Icon ? (
                <Icon className="relative size-6" />
              ) : null}
            </ToggleGroupItem>
          );
        })}

        {customBackgroundImages.map((img) => (
          <ToggleGroupItem
            key={img.id}
            value={customToggleValue(img.id)}
            aria-label="Custom background"
            onMouseDown={dropFocus}
            onClick={() => selectCustom(img.id)}
            className={cn("hover:bg-background/60 size-12 border-muted p-0", selectedItemClass)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- session blob urls */}
            <img src={img.url} alt="" className="size-full rounded-[inherit] object-cover" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <label
        className="inline-flex size-12 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground"
        aria-label="Upload background photo"
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
