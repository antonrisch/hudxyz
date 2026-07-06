import type { CSSProperties } from "react";

// environments drive the canvas stage and the additive preview behind the waveguide.
export type EnvironmentKey = "alps" | "alps2" | "daylight" | "night" | "custom";

export type EnvironmentPreset = {
  key: EnvironmentKey;
  label: string;
  image?: string;
};

const ENV_GRADIENT = {
  daylight: "linear-gradient(to bottom, var(--env-day-from), var(--env-day-to))",
  night: "linear-gradient(to bottom, var(--env-night-from), var(--env-night-to))",
} as const satisfies Partial<Record<EnvironmentKey, string>>;

export const DEFAULT_ENVIRONMENT: EnvironmentKey = "alps";

// preset photos ship as JPEG in /public/environments/ (longest edge ≤3200px, ~300–800KB).
export const ENVIRONMENTS = [
  {
    key: "alps",
    label: "Alps",
    image: "/environments/alps.jpg",
  },
  {
    key: "alps2",
    label: "Alps 2",
    image: "/environments/alps2.jpg",
  },
  { key: "daylight", label: "Day" },
  { key: "night", label: "Night" },
  {
    key: "custom",
    label: "Custom",
  },
] as const satisfies ReadonlyArray<EnvironmentPreset>;

export function isEnvironmentKey(value: string): value is EnvironmentKey {
  return ENVIRONMENTS.some((env) => env.key === value);
}

export function environmentByKey(key: EnvironmentKey): EnvironmentPreset {
  return ENVIRONMENTS.find((env) => env.key === key) ?? ENVIRONMENTS[0];
}

export type CustomEnvironmentImage = { id: string; url: string };

export function resolveEnvironment(
  key: EnvironmentKey,
  customImages: readonly CustomEnvironmentImage[],
  activeCustomId: string | null,
): EnvironmentPreset {
  const preset = environmentByKey(key);
  if (key !== "custom" || customImages.length === 0) return preset;
  const active = customImages.find((img) => img.id === activeCustomId) ?? customImages[0];
  return { ...preset, image: active.url };
}

const MAX_BACKGROUND_BLUR_PX = 24;

export function environmentBackdropFilter(
  _preset: EnvironmentPreset,
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

export function environmentBackdropStyle(
  preset: EnvironmentPreset,
  backgroundBrightness = 80,
  backgroundBlur = 0,
): CSSProperties {
  const filter = environmentBackdropFilter(preset, backgroundBrightness, backgroundBlur);

  if (preset.image) {
    return {
      backgroundColor: "var(--env-fill)",
      backgroundImage: `url(${preset.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...(filter && { filter }),
    };
  }

  const gradient = ENV_GRADIENT[preset.key as keyof typeof ENV_GRADIENT];
  if (gradient) return { backgroundImage: gradient, ...(filter && { filter }) };

  return { backgroundColor: "var(--env-fill)", ...(filter && { filter }) };
}

export function additiveEnvBg(preset: EnvironmentPreset, image?: string): string {
  if (preset.image) {
    const src = image ?? (preset.image.startsWith("blob:") ? undefined : preset.image);
    return src ? `url("${src}")` : "none";
  }

  const gradient = ENV_GRADIENT[preset.key as keyof typeof ENV_GRADIENT];
  return gradient ? resolveHostBackgroundImage(gradient) : "none";
}

export function additiveEnvFilter(
  preset: EnvironmentPreset,
  backgroundBrightness = 80,
  backgroundBlur = 0,
  blurScale = 1,
): string {
  return (
    environmentBackdropFilter(preset, backgroundBrightness, backgroundBlur, blurScale) ?? "none"
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
