import type { CSSProperties } from "react";
import { BACKGROUND_LQIP } from "@/lib/simulator/background-lqip";

// backgrounds drive the canvas stage and the additive preview behind the waveguide.
export type BackgroundKey =
  | "alps"
  | "alps2"
  | "beach"
  | "city-day"
  | "city-night"
  | "bike-trail"
  | "day"
  | "night"
  | "custom";

export type BackgroundMediaKind = "gradient" | "photo" | "video";

export type BackgroundPreset = {
  key: BackgroundKey;
  label: string;
  image?: string;
  video?: string;
  poster?: string;
  thumb?: string;
  placeholderColor?: string;
  lqip?: string;
};

export const STAGE_FILL_FALLBACK = "var(--stage-fill)";

export type BackdropPlaceholder = {
  color: string;
  lqip?: string;
};

export const BACKGROUND_GRADIENT = {
  day: "linear-gradient(to bottom, var(--bg-day-from), var(--bg-day-to))",
  night: "linear-gradient(to bottom, var(--bg-night-from), var(--bg-night-to))",
} as const satisfies Partial<Record<BackgroundKey, string>>;

export const DEFAULT_BACKGROUND: BackgroundKey = "alps";

// photo backgrounds are slightly overscaled so blur never exposes the stage edge.
export const BACKDROP_SCALE = 1.1;

// preset photos ship as WebP in /public/backgrounds/ (display ~200–300KB @1920px).
export const BACKGROUNDS = [
  {
    key: "alps",
    label: "Alps",
    image: "/backgrounds/alps.webp",
    thumb: "/backgrounds/alps-thumb.webp",
    placeholderColor: "#355677",
    lqip: BACKGROUND_LQIP.alps,
  },
  {
    key: "alps2",
    label: "Alps 2",
    image: "/backgrounds/alps2.webp",
    thumb: "/backgrounds/alps2-thumb.webp",
    placeholderColor: "#4f597d",
    lqip: BACKGROUND_LQIP.alps2,
  },
  {
    key: "beach",
    label: "Beach",
    image: "/backgrounds/beach.webp",
    thumb: "/backgrounds/beach-thumb.webp",
    placeholderColor: "#bdbbac",
    lqip: BACKGROUND_LQIP.beach,
  },
  {
    key: "city-day",
    label: "City (Day)",
    video: "/backgrounds/city-day.mp4",
    poster: "/backgrounds/city-day-poster.webp",
    thumb: "/backgrounds/city-day-thumb.webp",
    placeholderColor: "#8e9eab",
    lqip: BACKGROUND_LQIP["city-day"],
  },
  {
    key: "city-night",
    label: "City (Night)",
    video: "/backgrounds/city-night.mp4",
    poster: "/backgrounds/city-night-poster.webp",
    thumb: "/backgrounds/city-night-thumb.webp",
    placeholderColor: "#2c3e50",
    lqip: BACKGROUND_LQIP["city-night"],
  },
  {
    key: "bike-trail",
    label: "Bike (Trail)",
    video: "/backgrounds/bike-trail.mp4",
    poster: "/backgrounds/bike-trail-poster.webp",
    thumb: "/backgrounds/bike-trail-thumb.webp",
    placeholderColor: "#3d4a38",
    lqip: BACKGROUND_LQIP["bike-trail"],
  },
  /*
  {
    key: "bike-city",
    label: "Bike (City)",
    video: "/backgrounds/bike-city.mp4",
    poster: "/backgrounds/bike-city-poster.webp",
    thumb: "/backgrounds/bike-city-thumb.webp",
    placeholderColor: "#4a4a4a",
    lqip: BACKGROUND_LQIP["bike-city"],
  },
  */
  { key: "day", label: "Day" },
  { key: "night", label: "Night" },
  {
    key: "custom",
    label: "Custom",
  },
] as const satisfies ReadonlyArray<BackgroundPreset>;

export function isBackgroundKey(value: string): value is BackgroundKey {
  return BACKGROUNDS.some((bg) => bg.key === value);
}

export function backgroundByKey(key: BackgroundKey): BackgroundPreset {
  return BACKGROUNDS.find((bg) => bg.key === key) ?? BACKGROUNDS[0];
}

export function backgroundMediaKind(preset: BackgroundPreset): BackgroundMediaKind {
  if (preset.video) return "video";
  if (preset.image) return "photo";
  return "gradient";
}

export function backdropUsesOverscale(preset: BackgroundPreset): boolean {
  return backgroundMediaKind(preset) === "photo" || backgroundMediaKind(preset) === "video";
}

export type CustomBackgroundImage = {
  id: string;
  url: string;
  thumbUrl: string;
};

export function resolveBackground(
  key: BackgroundKey,
  customImages: readonly CustomBackgroundImage[],
  activeCustomBackgroundId: string | null,
): BackgroundPreset {
  const preset = backgroundByKey(key);
  if (key !== "custom" || customImages.length === 0) return preset;
  const active = customImages.find((img) => img.id === activeCustomBackgroundId) ?? customImages[0];
  return { ...preset, image: active.url };
}

export function resolveBackdropPlaceholder(
  key: BackgroundKey,
  customImages: readonly CustomBackgroundImage[],
  activeCustomBackgroundId: string | null,
): BackdropPlaceholder {
  if (key === "custom" && customImages.length > 0) {
    const active =
      customImages.find((img) => img.id === activeCustomBackgroundId) ?? customImages[0];
    return { color: STAGE_FILL_FALLBACK, lqip: active.thumbUrl };
  }

  const preset = backgroundByKey(key);
  if (preset.placeholderColor) {
    return { color: preset.placeholderColor, lqip: preset.lqip };
  }

  return { color: STAGE_FILL_FALLBACK };
}

export function backgroundImageHref(key: BackgroundKey): string | undefined {
  if (key === "custom") return undefined;
  return backgroundByKey(key).image;
}

export function backgroundPreloadHref(key: BackgroundKey): string | undefined {
  if (key === "custom") return undefined;
  const preset = backgroundByKey(key);
  if (preset.poster) return preset.poster;
  return preset.image;
}

const MAX_BACKGROUND_BLUR_PX = 24;

export function backgroundBackdropFilter(
  _preset: BackgroundPreset,
  backgroundBrightness: number,
  backgroundBlur: number,
  blurScale = 1,
): string | undefined {
  const parts: string[] = [];

  if (backgroundBrightness < 100) {
    parts.push(`brightness(${backgroundBrightness / 100})`);
  }

  const blurPx = (backgroundBlur / 100) * MAX_BACKGROUND_BLUR_PX * blurScale;
  if (blurPx > 0) parts.push(`blur(${blurPx}px)`);

  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function backgroundBackdropStyle(
  preset: BackgroundPreset,
  backgroundBrightness = 80,
  backgroundBlur = 0,
): CSSProperties {
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur);

  if (preset.image) {
    return {
      backgroundColor: "var(--stage-fill)",
      backgroundImage: `url(${preset.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...(filter && { filter }),
    };
  }

  const gradient = BACKGROUND_GRADIENT[preset.key as keyof typeof BACKGROUND_GRADIENT];
  if (gradient) return { backgroundImage: gradient, ...(filter && { filter }) };

  return { backgroundColor: "var(--stage-fill)", ...(filter && { filter }) };
}
