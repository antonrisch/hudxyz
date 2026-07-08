"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  backgroundBackdropStyle,
  type BackdropPlaceholder,
  type BackgroundPreset,
} from "@/lib/simulator/background";
import { useBackdropVideoLeader, useBackdropVideoMirror } from "@/lib/simulator/use-backdrop-video";
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

function FadingVideoLayer({
  src,
  poster,
  preset,
  placeholder,
  backgroundBrightness,
  backgroundBlur,
}: {
  src: string;
  poster?: string;
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur);
  const fadeMs = reducedMotion ? 0 : PHOTO_FADE_MS;
  const shouldPlay = !reducedMotion;

  useBackdropVideoLeader(videoRef, shouldPlay);

  return (
    <>
      <PlaceholderLayers placeholder={placeholder} poster={poster} overscale />
      <video
        ref={(el) => {
          if (el) {
            videoRef.current = el;
            if (el.readyState >= 3) setReady(true);
          }
        }}
        key={src}
        src={shouldPlay ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload={shouldPlay ? "auto" : "none"}
        aria-hidden
        className="absolute w-px h-px opacity-0 pointer-events-none"
        onCanPlay={() => setReady(true)}
      />
      <BackdropVideoMirror
        className={cn(
          videoLayerClass,
          !reducedMotion && "transition-opacity ease-out",
          ready || reducedMotion ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `scale(${BACKDROP_SCALE})`,
          transitionDuration: `${fadeMs}ms`,
          ...(filter && { filter }),
        }}
      />
    </>
  );
}

/**
 * Renders the backdrop media layer (gradient, photo, or video leader).
 * For the additive video mirror, use {@link BackdropVideoMirror} instead.
 */
export function BackdropMedia({
  preset,
  placeholder,
  backgroundBrightness,
  backgroundBlur,
}: {
  preset: BackgroundPreset;
  placeholder: BackdropPlaceholder;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  if (preset.video) {
    return (
      <FadingVideoLayer
        key={preset.video}
        src={preset.video}
        poster={preset.poster}
        preset={preset}
        placeholder={placeholder}
        backgroundBrightness={backgroundBrightness}
        backgroundBlur={backgroundBlur}
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

/**
 * Canvas that mirrors the leader video's frames into the additive slice.
 * Single decoder — draws the exact frame the leader shows via requestVideoFrameCallback.
 */
export function BackdropVideoMirror({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useBackdropVideoMirror(canvasRef, true);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("absolute inset-0 size-full object-cover", className)}
      style={style}
    />
  );
}
