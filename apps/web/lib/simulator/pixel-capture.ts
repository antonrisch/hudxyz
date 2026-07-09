/**
 * One-shot Region Capture for screenshots (drawImage from a preview <video>).
 * Continuous recording lives in lib/simulator/record/.
 */

import { openStageCapture } from "@/lib/simulator/record";

export async function captureStagePixels(stage: HTMLElement): Promise<HTMLCanvasElement | null> {
  const session = await openStageCapture(stage);
  if (!session) return null;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = session.stream;

  try {
    await video.play();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    const { width, height } = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  } finally {
    video.srcObject = null;
    session.stop();
  }
}
