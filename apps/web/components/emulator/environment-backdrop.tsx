import {
  ENV_BACKDROP_SCALE,
  environmentBackdropStyle,
  type EnvironmentPreset,
} from "@/lib/emulator/environment";
import { cn } from "@/lib/utils";

export function EnvironmentBackdrop({
  preset,
  backgroundBrightness,
  backgroundBlur,
}: {
  preset: EnvironmentPreset;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", preset.image && "origin-center")}
      style={{
        ...environmentBackdropStyle(preset, backgroundBrightness, backgroundBlur),
        ...(preset.image && { transform: `scale(${ENV_BACKDROP_SCALE})` }),
      }}
    />
  );
}
