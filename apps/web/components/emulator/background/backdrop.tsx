import {
  BACKDROP_SCALE,
  backgroundBackdropStyle,
  type BackgroundPreset,
} from "@/lib/emulator/background";
import { cn } from "@/lib/utils";

export function BackgroundBackdrop({
  preset,
  backgroundBrightness,
  backgroundBlur,
}: {
  preset: BackgroundPreset;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", preset.image && "origin-center")}
      style={{
        ...backgroundBackdropStyle(preset, backgroundBrightness, backgroundBlur),
        ...(preset.image && { transform: `scale(${BACKDROP_SCALE})` }),
      }}
    />
  );
}
