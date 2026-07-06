import {
  BACKDROP_SCALE,
  backgroundBackdropStyle,
  type BackgroundPreset,
} from "@/lib/emulator/background";

export function BackgroundBackdrop({
  preset,
  backgroundBrightness,
  backgroundBlur,
}: {
  preset: BackgroundPreset;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  const scaled = Boolean(preset.image);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={scaled ? "absolute inset-0 origin-center" : "absolute inset-0"}
        style={{
          ...backgroundBackdropStyle(preset, backgroundBrightness, backgroundBlur),
          ...(scaled && { transform: `scale(${BACKDROP_SCALE})` }),
        }}
      />
    </div>
  );
}
