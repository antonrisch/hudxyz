// Region Capture: read already-painted tab pixels instead of re-serializing DOM.
// Meta's Chrome extension uses the same approach (getDisplayMedia + body crop).

declare global {
  interface CropTarget {}
  interface Window {
    CropTarget?: { fromElement(element: Element): Promise<CropTarget> };
  }
  interface MediaStreamTrack {
    cropTo?(target: CropTarget): Promise<void>;
  }
}

type DisplayMediaWithPreferTab = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
};

export type PixelCaptureSession = {
  video: HTMLVideoElement;
  stop: () => void;
};

export function canUsePixelCapture(): boolean {
  return (
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof window.CropTarget?.fromElement === "function"
  );
}

export async function openStagePixelCapture(
  stage: HTMLElement,
): Promise<PixelCaptureSession | null> {
  if (!canUsePixelCapture()) return null;

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" } as MediaTrackConstraints,
      preferCurrentTab: true,
    } as DisplayMediaWithPreferTab);

    const track = stream.getVideoTracks()[0];
    if (!track?.cropTo) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
    if (settings.displaySurface && settings.displaySurface !== "browser") {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    const cropTarget = await window.CropTarget!.fromElement(stage);
    await track.cropTo(cropTarget);

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    return {
      video,
      stop: () => {
        stream?.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      },
    };
  } catch {
    stream?.getTracks().forEach((t) => t.stop());
    return null;
  }
}

export function drawStagePixelFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export async function captureStagePixels(stage: HTMLElement): Promise<HTMLCanvasElement | null> {
  const session = await openStagePixelCapture(stage);
  if (!session) return null;

  try {
    await waitForPaint();
    const { width, height } = stage.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    drawStagePixelFrame(session.video, canvas);
    return canvas;
  } finally {
    session.stop();
  }
}
