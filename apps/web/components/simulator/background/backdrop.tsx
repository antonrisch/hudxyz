"use client";

import { forwardRef, useState } from "react";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  backgroundBackdropStyle,
  type BackdropPlaceholder,
  type BackgroundPreset,
} from "@/lib/simulator/background";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const PHOTO_FADE_MS = 500;
const LQIP_BLUR_PX = 24;

const photoLayerBase = {
  backgroundSize: "cover" as const,
  backgroundPosition: "center" as const,
  transform: `scale(${BACKDROP_SCALE})`,
};

function FadingPhotoLayer({
  src,
  preset,
  placeholder,
  backgroundBrightness,
  backgroundBlur,
}: {
  src: string;
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [cached, setCached] = useState(false);
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur);
  const instant = cached || reducedMotion;
  const fadeMs = instant ? 0 : PHOTO_FADE_MS;

  const markReady = (fromCache: boolean) => {
    setReady(true);
    if (fromCache) setCached(true);
  };

  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        className="hidden"
        onLoad={() => markReady(false)}
        ref={(el) => {
          if (el?.complete) markReady(true);
        }}
      />
      <div
        className="absolute inset-0 origin-center"
        style={{ backgroundColor: placeholder.color }}
      />
      {placeholder.lqip ? (
        <div
          className="absolute inset-0 origin-center"
          style={{
            ...photoLayerBase,
            backgroundImage: `url(${placeholder.lqip})`,
            filter: `blur(${LQIP_BLUR_PX}px)`,
          }}
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-0 origin-center",
          !instant && "transition-opacity ease-out",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{
          ...photoLayerBase,
          backgroundImage: `url(${src})`,
          transitionDuration: `${fadeMs}ms`,
          ...(filter && { filter }),
        }}
      />
    </>
  );
}

export const BackgroundBackdrop = forwardRef<
  HTMLDivElement,
  {
    preset: BackgroundPreset;
    placeholder: BackdropPlaceholder;
    backgroundBrightness: number;
    backgroundBlur: number;
  }
>(function BackgroundBackdrop({ preset, placeholder, backgroundBrightness, backgroundBlur }, ref) {
  if (preset.image) {
    return (
      <div
        ref={ref}
        aria-hidden
        data-capture="backdrop"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <FadingPhotoLayer
          key={preset.image}
          src={preset.image}
          preset={preset}
          placeholder={placeholder}
          backgroundBrightness={backgroundBrightness}
          backgroundBlur={backgroundBlur}
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
      style={backgroundBackdropStyle(preset, backgroundBrightness, backgroundBlur)}
    />
  );
});

BackgroundBackdrop.displayName = "BackgroundBackdrop";
