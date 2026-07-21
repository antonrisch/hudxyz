"use client";

import { useRef, type ChangeEvent, type ReactNode } from "react";
import { ImagePlus, Moon, Play, Sun, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { cn } from "@/lib/utils";
import { BACKGROUNDS, type BackgroundKey, type BackgroundPreset } from "@/lib/simulator/background";
import {
  customBackgroundFailReason,
  prepareCustomBackgroundImage,
  revokeBackgroundImageUrl,
} from "@/lib/simulator/background-image";
import { simulatorParsers } from "@/lib/simulator/search-params";
import { Button, buttonVariants } from "@/components/ui/button";
import { dropFocus } from "@/lib/simulator/input";
import { track } from "@/lib/analytics/track";

const GRADIENT_SWATCH = {
  day: {
    className:
      "inline-flex items-center justify-center bg-linear-to-b from-bg-day-from to-bg-day-to",
    Icon: Sun,
  },
  night: {
    className:
      "inline-flex items-center justify-center bg-linear-to-b from-bg-night-from to-bg-night-to",
    Icon: Moon,
  },
} as const;

const customId = (id: string) => `custom:${id}`;

/** Strong ease-out — ring grows immediately, soft settle. */
const SWATCH_EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

/**
 * Selection chrome: ring-0 → ring-2 + offset. Only box-shadow transitions so the
 * grow feels continuous (Tailwind rings are box-shadow under the hood).
 */
const selectChrome = (selected: boolean) =>
  cn(
    "ring-offset-background outline-none",
    "transition-[transform,box-shadow] duration-200",
    SWATCH_EASE,
    "active:scale-[0.97]",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
    selected
      ? "ring-2 ring-offset-2 ring-primary"
      : cn(
          "ring-0 ring-offset-0",
          "[@media(hover:hover)]:hover:ring-1 [@media(hover:hover)]:hover:ring-offset-1 [@media(hover:hover)]:hover:ring-muted-foreground/55",
        ),
  );

const SWATCH = "size-12 rounded-lg";

function SwatchThumb({ src }: { src: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-[inherit] bg-cover bg-center"
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

function Swatch({
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onMouseDown={dropFocus}
      onClick={onSelect}
      className={cn("relative shrink-0 p-0", SWATCH, selectChrome(selected), className)}
    >
      {children}
    </button>
  );
}

function CustomSwatch({
  thumbUrl,
  selected,
  onSelect,
  onRemove,
}: {
  thumbUrl: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn("group relative shrink-0", SWATCH)}>
      <Swatch
        label="Custom background"
        selected={selected}
        onSelect={onSelect}
        className="size-full"
      >
        <SwatchThumb src={thumbUrl} />
      </Swatch>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label="Remove custom background"
        className="absolute -top-2 -right-2 z-10 size-5 rounded-full bg-background opacity-0 shadow-sm group-hover:opacity-100 focus-visible:opacity-100"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dropFocus(e);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      >
        <X />
      </Button>
    </div>
  );
}

export function BackgroundPicker() {
  const { store } = useSimulator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const background = useSimulatorState((s) => s.background);
  const customBackgroundImages = useSimulatorState((s) => s.customBackgroundImages);
  const activeCustomBackgroundId = useSimulatorState((s) => s.activeCustomBackgroundId);
  const [, setBackgroundParam] = useQueryState("bg", simulatorParsers.bg);

  const selected =
    background === "custom" && activeCustomBackgroundId
      ? customId(activeCustomBackgroundId)
      : background;

  const selectPreset = (key: BackgroundKey) => {
    store.getState().setBackground(key);
    void setBackgroundParam(key);
    track("background_selected", { background: key });
  };

  const selectCustom = (id: string) => {
    store.getState().selectCustomBackground(id);
    void setBackgroundParam("custom");
    track("background_selected", { background: "custom" });
  };

  const removeCustom = (id: string) => {
    const img = store.getState().customBackgroundImages.find((entry) => entry.id === id);
    if (!img) return;

    store.getState().removeCustomBackground(id);
    revokeBackgroundImageUrl(img.url);
    revokeBackgroundImageUrl(img.thumbUrl);

    const nextBg = store.getState().background;
    void setBackgroundParam(nextBg);
    track("custom_background_removed", {
      custom_count: store.getState().customBackgroundImages.length,
    });
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    void prepareCustomBackgroundImage(file)
      .then(({ url, thumbUrl }) => {
        store.getState().addCustomBackground(url, thumbUrl);
        void setBackgroundParam("custom");
        track("custom_background_added", {
          custom_count: store.getState().customBackgroundImages.length,
        });
        track("background_selected", { background: "custom" });
      })
      .catch((error: unknown) => {
        track("custom_background_failed", { reason: customBackgroundFailReason(error) });
      });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Background"
      className="flex flex-wrap items-center gap-2 py-2"
    >
      {BACKGROUNDS.filter((bg) => bg.key !== "custom").map((bg) => {
        const isSelected = selected === bg.key;
        const onSelect = () => selectPreset(bg.key);
        const gradient = GRADIENT_SWATCH[bg.key as keyof typeof GRADIENT_SWATCH];

        if (gradient) {
          const { className, Icon } = gradient;
          return (
            <Swatch
              key={bg.key}
              label={bg.label}
              selected={isSelected}
              onSelect={onSelect}
              className={className}
            >
              <Icon className="size-5 text-white" />
            </Swatch>
          );
        }

        if ("image" in bg && bg.image) {
          const preset = bg as BackgroundPreset;
          return (
            <Swatch key={bg.key} label={bg.label} selected={isSelected} onSelect={onSelect}>
              <SwatchThumb src={preset.thumb ?? preset.image!} />
            </Swatch>
          );
        }

        if ("video" in bg && bg.video) {
          const preset = bg as BackgroundPreset;
          return (
            <Swatch key={bg.key} label={bg.label} selected={isSelected} onSelect={onSelect}>
              <SwatchThumb src={preset.thumb ?? preset.poster!} />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_100%_100%,rgba(0,0,0,0.55)_0%,transparent_65%)]"
              />
              <Play
                aria-hidden
                className="pointer-events-none absolute bottom-1 right-1 size-4 text-white drop-shadow-sm"
                fill="currentColor"
              />
            </Swatch>
          );
        }

        return null;
      })}

      {customBackgroundImages.map((img) => (
        <CustomSwatch
          key={img.id}
          thumbUrl={img.thumbUrl}
          selected={selected === customId(img.id)}
          onSelect={() => selectCustom(img.id)}
          onRemove={() => removeCustom(img.id)}
        />
      ))}

      <label
        className={cn(
          buttonVariants({ variant: "outline" }),
          SWATCH,
          "cursor-pointer border-border bg-muted text-muted-foreground",
          "transition-[transform,background-color,color] duration-150",
          SWATCH_EASE,
          "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
          "[@media(hover:hover)]:hover:bg-input/80 [@media(hover:hover)]:hover:text-foreground",
        )}
        aria-label="Upload background photo"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />
        <ImagePlus className="size-5" />
      </label>
    </div>
  );
}
