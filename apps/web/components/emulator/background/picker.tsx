"use client";

import Image from "next/image";
import { useRef, type ChangeEvent, type ReactNode } from "react";
import { ImagePlus, Moon, Sun, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";
import { BACKGROUNDS, type BackgroundKey } from "@/lib/emulator/background";
import {
  prepareCustomBackgroundImage,
  revokeBackgroundImageUrl,
} from "@/lib/emulator/background-image";
import { emulatorParsers } from "@/lib/emulator/search-params";
import { Button, buttonVariants } from "@/components/ui/button";
import { dropFocus } from "@/lib/emulator/input";

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

const selectChrome = (selected: boolean) =>
  cn(
    "ring-offset-background transition-shadow",
    selected
      ? "ring-2 ring-offset-2 ring-primary"
      : "ring-0 ring-offset-0 hover:ring-1 hover:ring-offset-1 hover:ring-muted-foreground/80 active:ring-2 active:ring-offset-2 active:ring-primary",
  );

const SWATCH = "size-12 rounded-lg";
const PICKER_PX = 48;

function SwatchThumb({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <Image
        src={src}
        alt=""
        fill
        sizes={`${PICKER_PX}px`}
        quality={75}
        unoptimized={src.startsWith("blob:")}
        className="object-cover"
      />
    </div>
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
      className={cn(
        "relative shrink-0 p-0 outline-none",
        SWATCH,
        selectChrome(selected),
        className,
      )}
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
    <div className={cn("relative shrink-0", SWATCH)}>
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
        className="absolute -top-1.5 -right-1.5 z-10 size-4 rounded-full bg-background shadow-sm"
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
        <X className="size-2.5" />
      </Button>
    </div>
  );
}

export function BackgroundPicker() {
  const { store } = useEmulator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const background = useEmulatorState((s) => s.background);
  const customBackgroundImages = useEmulatorState((s) => s.customBackgroundImages);
  const activeCustomBackgroundId = useEmulatorState((s) => s.activeCustomBackgroundId);
  const [, setBackgroundParam] = useQueryState("bg", emulatorParsers.bg);

  const selected =
    background === "custom" && activeCustomBackgroundId
      ? customId(activeCustomBackgroundId)
      : background;

  const selectPreset = (key: BackgroundKey) => {
    store.getState().setBackground(key);
    void setBackgroundParam(key);
  };

  const selectCustom = (id: string) => {
    store.getState().selectCustomBackground(id);
    void setBackgroundParam("custom");
  };

  const removeCustom = (id: string) => {
    const img = store.getState().customBackgroundImages.find((entry) => entry.id === id);
    if (!img) return;

    store.getState().removeCustomBackground(id);
    revokeBackgroundImageUrl(img.url);
    revokeBackgroundImageUrl(img.thumbUrl);

    const nextBg = store.getState().background;
    void setBackgroundParam(nextBg);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    void prepareCustomBackgroundImage(file)
      .then(({ url, thumbUrl, iframeDataUrl }) => {
        store.getState().addCustomBackground(url, thumbUrl, iframeDataUrl);
        void setBackgroundParam("custom");
      })
      .catch(() => {});
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
          return (
            <Swatch key={bg.key} label={bg.label} selected={isSelected} onSelect={onSelect}>
              <SwatchThumb src={bg.image} />
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
          "cursor-pointer border-border bg-muted text-muted-foreground hover:bg-input/80 hover:text-foreground",
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
