import { environmentBackdropStyle, type EnvironmentPreset } from "@/lib/emulator/environment";
import { cn } from "@/lib/utils";

export function EnvironmentBackdrop({ preset }: { preset: EnvironmentPreset }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        preset.image && "origin-center scale-110",
      )}
      style={environmentBackdropStyle(preset)}
    />
  );
}
