import type { CSSProperties } from "react";
import { BACKGROUND_LQIP } from "@/lib/simulator/background-lqip";

// backgrounds drive the canvas stage and the additive preview behind the waveguide.
export type BackgroundKey = "alps" | "alps2" | "beach" | "day" | "night" | "custom";

export type BackgroundPreset = {
  key: BackgroundKey;
  label: string;
  image?: string;
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

// preset photos ship as JPEG in /public/backgrounds/ (longest edge ≤3200px, ~300–800KB).
export const BACKGROUNDS = [
  {
    key: "alps",
    label: "Alps",
    image: "/backgrounds/alps.jpg",
    placeholderColor: "#355677",
    lqip: BACKGROUND_LQIP.alps,
  },
  {
    key: "alps2",
    label: "Alps 2",
    image: "/backgrounds/alps2.jpg",
    placeholderColor: "#4f597d",
    lqip: BACKGROUND_LQIP.alps2,
  },
  {
    key: "beach",
    label: "Beach",
    image: "/backgrounds/beach.jpg",
    placeholderColor: "#bdbbac",
    lqip: BACKGROUND_LQIP.beach,
  },
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

export type CustomBackgroundImage = {
  id: string;
  url: string;
  thumbUrl: string;
  iframeDataUrl: string;
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

export function additiveBackgroundBg(preset: BackgroundPreset, image?: string): string {
  if (preset.image) {
    // iframe css resolves urls against the proxied app origin — never inject host-relative
    // /backgrounds/* paths; wait for the parent to supply a compressed data: url instead.
    const src =
      image ??
      (preset.image.startsWith("blob:") || preset.image.startsWith("/") ? undefined : preset.image);
    if (!src) return "none";
    return src.startsWith("data:") ? `url(${src})` : `url("${src}")`;
  }

  const gradient = BACKGROUND_GRADIENT[preset.key as keyof typeof BACKGROUND_GRADIENT];
  return gradient ? resolveHostBackgroundImage(gradient) : "none";
}

export function additiveBackgroundFilter(
  preset: BackgroundPreset,
  backgroundBrightness = 80,
  backgroundBlur = 0,
  blurScale = 1,
): string {
  return (
    backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur, blurScale) ?? "none"
  );
}

function resolveHostBackgroundImage(source: string): string {
  const probe = document.createElement("div");
  probe.style.backgroundImage = source;
  document.documentElement.append(probe);
  const resolved = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return resolved !== "none" ? resolved : source;
}
