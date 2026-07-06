import Image from "next/image";
import {
  BACKDROP_SCALE,
  backgroundBackdropFilter,
  backgroundBackdropStyle,
  type BackgroundPreset,
} from "@/lib/simulator/background";

export function BackgroundBackdrop({
  preset,
  backgroundBrightness,
  backgroundBlur,
}: {
  preset: BackgroundPreset;
  backgroundBrightness: number;
  backgroundBlur: number;
}) {
  const filter = backgroundBackdropFilter(preset, backgroundBrightness, backgroundBlur);

  if (preset.image) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={preset.image}
          alt=""
          fill
          sizes="(min-width: 640px) calc(100vw - 19.5rem), calc(100vw - 1rem)"
          quality={75}
          priority
          unoptimized={preset.image.startsWith("blob:")}
          className="origin-center object-cover"
          style={{
            transform: `scale(${BACKDROP_SCALE})`,
            ...(filter && { filter }),
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={backgroundBackdropStyle(preset, backgroundBrightness, backgroundBlur)}
    />
  );
}
