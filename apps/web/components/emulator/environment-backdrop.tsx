import { environmentBackdropFilter, type EnvironmentPreset } from "@/lib/emulator/environment";

// photo or flat color fill for the canvas stage.
export function EnvironmentBackdrop({ preset }: { preset: EnvironmentPreset }) {
  if (preset.kind === "photo" && preset.image) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-center scale-110 bg-cover bg-center"
        style={{
          backgroundImage: `url(${preset.image})`,
          filter: environmentBackdropFilter(preset),
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ backgroundColor: preset.color }}
    />
  );
}
