"use client";

import { useState, type CSSProperties } from "react";
import {
  BACKDROP_SCALE,
  backgroundBackdropStyle,
  type BackdropPlaceholder,
  type BackgroundPreset,
} from "@/lib/simulator/background";
import { useBackdropVideoPlayback } from "@/lib/simulator/use-backdrop-video";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const PHOTO_FADE_MS = 500;
const LQIP_BLUR_PX = 24;

const coverLayerClass = cn("absolute inset-0 size-full origin-center object-cover");

const placeholderLayerBase = {
  backgroundSize: "cover" as const,
  backgroundPosition: "center" as const,
};

/** Brightness/blur applied imperatively via --hud-bg-filter (see display-filters.ts). */
const hudBgFilter = { filter: "var(--hud-bg-filter, none)" } as const;

function PlaceholderLayers({
  placeholder,
  poster,
  overscale,
}: {
  placeholder: BackdropPlaceholder;
  poster?: string;
  overscale: boolean;
}) {
  const layerStyle = overscale
    ? { ...placeholderLayerBase, transform: `scale(${BACKDROP_SCALE})` }
    : placeholderLayerBase;

  return (
    <>
      <div
        className="absolute inset-0 origin-center"
        style={{ backgroundColor: placeholder.color }}
      />
      {placeholder.lqip ? (
        <div
          className="absolute inset-0 origin-center"
          style={{
            ...layerStyle,
            backgroundImage: `url(${placeholder.lqip})`,
            filter: `blur(${LQIP_BLUR_PX}px)`,
          }}
        />
      ) : null}
      {poster ? (
        <div
          className="absolute inset-0 origin-center"
          style={{
            ...layerStyle,
            backgroundImage: `url(${poster})`,
          }}
        />
      ) : null}
    </>
  );
}

type MediaPaintProps = {
  placeholder: BackdropPlaceholder;
  /** Keep decoding through tab-share pickers (recording). */
  keepPlaying?: boolean;
  showPlaceholder?: boolean;
  /**
   * Stage fill is exact stage size and needs CSS overscale.
   * Additive display slice is already sized via --hud-bg-* geometry.
   */
  overscale?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Single <img> — same layout as BackdropVideo (object-cover + optional overscale).
 * Used on the stage fill (!additive) or inside #hud-display (additive + overflow).
 */
export function BackdropPhoto({
  src,
  placeholder,
  showPlaceholder = true,
  overscale = true,
  className,
  style,
}: MediaPaintProps & { src: string }) {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [cached, setCached] = useState(false);
  const instant = cached || reducedMotion;
  const fadeMs = instant ? 0 : PHOTO_FADE_MS;

  const markReady = (fromCache: boolean) => {
    setReady(true);
    if (fromCache) setCached(true);
  };

  const mediaStyle = {
    ...(overscale ? { transform: `scale(${BACKDROP_SCALE})` } : null),
    transitionDuration: `${fadeMs}ms`,
    ...hudBgFilter,
    ...style,
  } satisfies CSSProperties;

  return (
    <>
      {showPlaceholder ? (
        <PlaceholderLayers placeholder={placeholder} overscale={overscale} />
      ) : null}
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn(
          coverLayerClass,
          !instant && "transition-opacity ease-out",
          ready ? "opacity-100" : "opacity-0",
          className,
        )}
        style={mediaStyle}
        onLoad={() => markReady(false)}
        ref={(el) => {
          if (el?.complete) markReady(true);
        }}
      />
    </>
  );
}

/**
 * Single hardware-decoded <video> — no canvas mirror.
 * Used on the stage fill (!additive) or inside #hud-display (additive + overflow).
 */
export function BackdropVideo({
  src,
  poster,
  placeholder,
  keepPlaying = false,
  showPlaceholder = true,
  overscale = true,
  className,
  style,
}: MediaPaintProps & { src: string; poster?: string }) {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const fadeMs = reducedMotion ? 0 : PHOTO_FADE_MS;
  const shouldPlay = !reducedMotion;
  const setVideoEl = useBackdropVideoPlayback(shouldPlay, keepPlaying);

  const mediaStyle = {
    ...(overscale ? { transform: `scale(${BACKDROP_SCALE})` } : null),
    transitionDuration: `${fadeMs}ms`,
    ...hudBgFilter,
    ...style,
  } satisfies CSSProperties;

  return (
    <>
      {showPlaceholder ? (
        <PlaceholderLayers placeholder={placeholder} poster={poster} overscale={overscale} />
      ) : null}
      {shouldPlay ? (
        <video
          ref={(el) => {
            setVideoEl(el);
            if (el && el.readyState >= 3) setReady(true);
          }}
          key={src}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
          className={cn(
            coverLayerClass,
            !reducedMotion && "transition-opacity ease-out",
            ready ? "opacity-100" : "opacity-0",
            className,
          )}
          style={mediaStyle}
          onCanPlay={(e) => {
            setReady(true);
            void e.currentTarget.play().catch(() => {});
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Stage fill media. When additive owns photo/video in #hud-display, pass
 * suppressMedia so this layer only paints LQIP/poster placeholders.
 */
export function BackdropMedia({
  preset,
  placeholder,
  suppressMedia = false,
  keepPlaying = false,
}: {
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  /** When true (additive + photo/video), skip live media — Device owns it. */
  suppressMedia?: boolean;
  keepPlaying?: boolean;
}) {
  if (preset.video) {
    if (suppressMedia) {
      return <PlaceholderLayers placeholder={placeholder} poster={preset.poster} overscale />;
    }
    return (
      <BackdropVideo
        key={preset.video}
        src={preset.video}
        poster={preset.poster}
        placeholder={placeholder}
        keepPlaying={keepPlaying}
      />
    );
  }

  if (preset.image) {
    if (suppressMedia) {
      return <PlaceholderLayers placeholder={placeholder} overscale />;
    }
    return <BackdropPhoto key={preset.image} src={preset.image} placeholder={placeholder} />;
  }

  return (
    <div
      className="absolute inset-0"
      style={{ ...backgroundBackdropStyle(preset), ...hudBgFilter }}
    />
  );
}
