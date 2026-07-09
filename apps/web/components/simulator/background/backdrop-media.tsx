"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  backgroundBackdropStyle,
  type BackdropPlaceholder,
  type BackgroundPreset,
} from "@/lib/simulator/background";
import { useBackdropVideoLeader } from "@/lib/simulator/use-backdrop-video";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const PHOTO_FADE_MS = 500;
const LQIP_BLUR_PX = 24;

const mediaLayerBase = {
  backgroundSize: "cover" as const,
  backgroundPosition: "center" as const,
  transform: `scale(${BACKDROP_SCALE})`,
};

const videoLayerClass = cn("absolute inset-0 size-full origin-center object-cover");

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
    ? mediaLayerBase
    : { backgroundSize: "cover" as const, backgroundPosition: "center" as const };

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
      <PlaceholderLayers placeholder={placeholder} overscale />
      <div
        className={cn(
          "absolute inset-0 origin-center",
          !instant && "transition-opacity ease-out",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{
          ...mediaLayerBase,
          backgroundImage: `url(${src})`,
          transitionDuration: `${fadeMs}ms`,
          ...(filter && { filter }),
        }}
      />
    </>
  );
}

/**
 * Single hardware-decoded <video> — no canvas mirror.
 * Used on the stage backdrop (!additive) or inside #hud-display (additive + overflow).
 */
export function BackdropVideo({
  src,
  poster,
  preset,
  placeholder,
  backgroundBrightness,
  backgroundBlur,
  keepPlaying = false,
  showPlaceholder = true,
  /** Stage backdrop is exact stage size and needs CSS overscale; additive slice is already sized. */
  overscale = true,
  className,
  style,
}: {
  src: string;
  poster?: string;
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  backgroundBrightness: number;
  backgroundBlur: number;
  /** Keep decoding through tab-share pickers (recording). */
  keepPlaying?: boolean;
  showPlaceholder?: boolean;
  overscale?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur);
  const fadeMs = reducedMotion ? 0 : PHOTO_FADE_MS;
  const shouldPlay = !reducedMotion;

  useBackdropVideoLeader(videoRef, shouldPlay, keepPlaying);

  const mediaStyle = {
    ...(overscale ? { transform: `scale(${BACKDROP_SCALE})` } : null),
    transitionDuration: `${fadeMs}ms`,
    ...(filter && { filter }),
    ...style,
  } satisfies CSSProperties;

  return (
    <>
      {showPlaceholder ? (
        <PlaceholderLayers placeholder={placeholder} poster={poster} overscale />
      ) : null}
      {shouldPlay ? (
        <video
          ref={(el) => {
            if (el) {
              videoRef.current = el;
              if (el.readyState >= 3) setReady(true);
            }
          }}
          key={src}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className={cn(
            videoLayerClass,
            !reducedMotion && "transition-opacity ease-out",
            ready ? "opacity-100" : "opacity-0",
            className,
          )}
          style={mediaStyle}
          onCanPlay={() => setReady(true)}
        />
      ) : null}
    </>
  );
}

/**
 * Stage backdrop media. For additive + video, only placeholders render here —
 * the live HW video lives in #hud-display (see Device) so mix-blend-screen works
 * without a JS canvas mirror.
 */
export function BackdropMedia({
  preset,
  placeholder,
  backgroundBrightness,
  backgroundBlur,
  suppressVideo = false,
  keepPlaying = false,
}: {
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  backgroundBrightness: number;
  backgroundBlur: number;
  /** When true (additive + video), skip the stage <video> — Device owns it. */
  suppressVideo?: boolean;
  keepPlaying?: boolean;
}) {
  if (preset.video) {
    if (suppressVideo) {
      return <PlaceholderLayers placeholder={placeholder} poster={preset.poster} overscale />;
    }
    return (
      <BackdropVideo
        key={preset.video}
        src={preset.video}
        poster={preset.poster}
        preset={preset}
        placeholder={placeholder}
        backgroundBrightness={backgroundBrightness}
        backgroundBlur={backgroundBlur}
        keepPlaying={keepPlaying}
      />
    );
  }

  if (preset.image) {
    return (
      <FadingPhotoLayer
        key={preset.image}
        src={preset.image}
        preset={preset}
        placeholder={placeholder}
        backgroundBrightness={backgroundBrightness}
        backgroundBlur={backgroundBlur}
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={backgroundBackdropStyle(preset, backgroundBrightness, backgroundBlur)}
    />
  );
}
