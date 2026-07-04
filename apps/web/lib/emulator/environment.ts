// environments drive the canvas stage and the additive preview behind the waveguide.
// photo presets use the same scenes as Meta's MRBD simulator extension (per-scene
// brightness matches their auto-dimming defaults).
export type EnvironmentKey = "daylight" | "night" | "custom";

export type EnvironmentKind = "color" | "photo";

export type EnvironmentPreset = {
  key: EnvironmentKey;
  label: string;
  kind: EnvironmentKind;
  color: string;
  image?: string;
  bgBrightness?: number;
};

export const DEFAULT_ENVIRONMENT: EnvironmentKey = "daylight";

export const ENVIRONMENTS = [
  { key: "daylight", label: "Day", kind: "color", color: "#B6D1E3" },
  { key: "night", label: "Night", kind: "color", color: "#1e293b" },
  {
    key: "custom",
    label: "Custom",
    kind: "photo",
    color: "#5a6570",
    bgBrightness: 70,
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

export function environmentBackdropFilter(preset: EnvironmentPreset): string | undefined {
  if (preset.kind !== "photo") return undefined;
  return `brightness(${(preset.bgBrightness ?? 70) / 100})`;
}
