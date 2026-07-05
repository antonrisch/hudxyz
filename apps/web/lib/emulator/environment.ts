import type { CSSProperties } from "react";

// environments drive the canvas stage and the additive preview behind the waveguide.
export type EnvironmentKey = "alps" | "daylight" | "night" | "custom";

export type EnvironmentPreset = {
  key: EnvironmentKey;
  label: string;
  image?: string;
  brightness?: number;
};

const ENV_GRADIENT = {
  daylight: "linear-gradient(to bottom, var(--env-day-from), var(--env-day-to))",
  night: "linear-gradient(to bottom, var(--env-night-from), var(--env-night-to))",
} as const satisfies Partial<Record<EnvironmentKey, string>>;

export const DEFAULT_ENVIRONMENT: EnvironmentKey = "alps";

export const ENVIRONMENTS = [
  {
    key: "alps",
    label: "Alps",
    image: "/environments/alps.jpg",
    brightness: 0.8,
  },
  { key: "daylight", label: "Day" },
  { key: "night", label: "Night" },
  {
    key: "custom",
    label: "Custom",
    brightness: 0.8,
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

export function environmentBackdropStyle(preset: EnvironmentPreset): CSSProperties {
  if (preset.image) {
    return {
      backgroundColor: "var(--env-fill)",
      backgroundImage: `url(${preset.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...(preset.brightness != null && { filter: `brightness(${preset.brightness})` }),
    };
  }

  const gradient = ENV_GRADIENT[preset.key as keyof typeof ENV_GRADIENT];
  if (gradient) return { backgroundImage: gradient };

  return { backgroundColor: "var(--env-fill)" };
}

export function additiveEnvBg(preset: EnvironmentPreset, image?: string): string {
  if (preset.image) {
    const src = image ?? (preset.image.startsWith("blob:") ? undefined : preset.image);
    return src ? `url("${src}")` : "none";
  }

  const gradient = ENV_GRADIENT[preset.key as keyof typeof ENV_GRADIENT];
  return gradient ? resolveHostBackgroundImage(gradient) : "none";
}

export function additiveEnvFilter(preset: EnvironmentPreset): string {
  if (preset.image && preset.brightness != null) return `brightness(${preset.brightness})`;
  return "none";
}

function resolveHostBackgroundImage(source: string): string {
  const probe = document.createElement("div");
  probe.style.backgroundImage = source;
  document.documentElement.append(probe);
  const resolved = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return resolved !== "none" ? resolved : source;
}
