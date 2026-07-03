// one color per environment: canvas stage and additive preview lens read the same value
// via css vars (--canvas-from/--canvas-to/--env-color). video environments can later
// drive these from a media source the same way.
export type EnvironmentKey = "daylight" | "night";

export type EnvironmentPreset = {
  key: EnvironmentKey;
  label: string;
  color: string;
};

export const DEFAULT_ENVIRONMENT: EnvironmentKey = "daylight";

export const ENVIRONMENTS = [
  { key: "daylight", label: "Daylight", color: "#B6D1E3" },
  { key: "night", label: "Night", color: "#1e293b" },
] as const satisfies ReadonlyArray<EnvironmentPreset>;

export function isEnvironmentKey(value: string): value is EnvironmentKey {
  return ENVIRONMENTS.some((env) => env.key === value);
}

export function environmentByKey(key: EnvironmentKey): EnvironmentPreset {
  return ENVIRONMENTS.find((env) => env.key === key) ?? ENVIRONMENTS[0];
}
