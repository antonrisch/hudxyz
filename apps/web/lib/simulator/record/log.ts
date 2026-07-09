import { LOG_PREFIX } from "@/lib/simulator/record/config";

export function logRecord(...args: unknown[]) {
  console.info(LOG_PREFIX, ...args);
}

export function trackCaptureInfo(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  const s = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  return {
    label: track.label || "(unnamed)",
    displaySurface: s.displaySurface ?? null,
    width: s.width ?? null,
    height: s.height ?? null,
    frameRate: s.frameRate ?? null,
  };
}
