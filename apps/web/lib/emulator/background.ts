import type { CSSProperties } from "react";

// backgrounds drive the canvas stage and the additive preview behind the waveguide.
export type BackgroundKey = "alps" | "alps2" | "day" | "night" | "custom";

export type BackgroundPreset = {
  key: BackgroundKey;
  label: string;
  image?: string;
};

export const BG_GRADIENT = {
  day: "linear-gradient(to bottom, var(--bg-day-from), var(--bg-day-to))",
  night: "linear-gradient(to bottom, var(--bg-night-from), var(--bg-night-to))",
} as const satisfies Partial<Record<BackgroundKey, string>>;

export const BG_GRADIENT_FILL = {
  day: "var(--bg-day-to)",
  night: "var(--bg-night-to)",
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
  },
  {
    key: "alps2",
    label: "Alps 2",
    image: "/backgrounds/alps2.jpg",
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

export type CustomBackgroundImage = { id: string; url: string };

export function resolveBackground(
  key: BackgroundKey,
  customImages: readonly CustomBackgroundImage[],
  activeCustomId: string | null,
): BackgroundPreset {
  const preset = backgroundByKey(key);
  if (key !== "custom" || customImages.length === 0) return preset;
  const active = customImages.find((img) => img.id === activeCustomId) ?? customImages[0];
  return { ...preset, image: active.url };
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
      backgroundColor: "var(--bg-fill)",
      backgroundImage: `url(${preset.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...(filter && { filter }),
    };
  }

  const gradient = BG_GRADIENT[preset.key as keyof typeof BG_GRADIENT];
  if (gradient) return { backgroundImage: gradient, ...(filter && { filter }) };

  return { backgroundColor: "var(--bg-fill)", ...(filter && { filter }) };
}

export function additiveBackgroundBg(preset: BackgroundPreset, image?: string): string {
  if (preset.image) {
    const src = image ?? (preset.image.startsWith("blob:") ? undefined : preset.image);
    return src ? `url("${src}")` : "none";
  }

  const gradient = BG_GRADIENT[preset.key as keyof typeof BG_GRADIENT];
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
