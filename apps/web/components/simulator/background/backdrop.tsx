"use client";

import { forwardRef } from "react";
import { BackdropMedia } from "@/components/simulator/background/backdrop-media";
import {
  backgroundBackdropStyle,
  type BackdropPlaceholder,
  type BackgroundPreset,
} from "@/lib/simulator/background";

export const BackgroundBackdrop = forwardRef<
  HTMLDivElement,
  {
    preset: BackgroundPreset;
    placeholder: BackdropPlaceholder;
    /** Additive + video: stage shows poster only; live video is in #hud-display. */
    suppressVideo?: boolean;
    keepPlaying?: boolean;
  }
>(function BackgroundBackdrop({ preset, placeholder, suppressVideo = false, keepPlaying = false }, ref) {
  const usesMediaLayer = Boolean(preset.image || preset.video);

  if (usesMediaLayer) {
    return (
      <div
        ref={ref}
        aria-hidden
        data-capture="backdrop"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <BackdropMedia
          preset={preset}
          placeholder={placeholder}
          suppressVideo={suppressVideo}
          keepPlaying={keepPlaying}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden
      data-capture="backdrop"
      className="pointer-events-none absolute inset-0"
      style={{
        ...backgroundBackdropStyle(preset),
        filter: "var(--hud-bg-filter, none)",
      }}
    />
  );
});

BackgroundBackdrop.displayName = "BackgroundBackdrop";
