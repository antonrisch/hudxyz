/**
 * Stage display capture: getDisplayMedia + Region Capture (CropTarget).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture
 */

export const CAPTURE_FRAME_RATE = 30;

declare global {
  interface CropTarget {}
  interface Window {
    CropTarget?: { fromElement(element: Element): Promise<CropTarget> };
  }
  interface MediaStreamTrack {
    cropTo?(target: CropTarget | null): Promise<void>;
  }
}

type CaptureControllerLike = {
  setFocusBehavior?: (behavior: "focus-captured-surface" | "no-focus-change") => void;
};

type DisplayMediaOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  controller?: CaptureControllerLike;
};

export type CaptureSession = {
  stream: MediaStream;
  stop: () => void;
};

export function canUseRegionCapture(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof window !== "undefined" &&
    typeof window.CropTarget?.fromElement === "function"
  );
}

async function openDisplayStream(frameRate = CAPTURE_FRAME_RATE): Promise<MediaStream | null> {
  let stream: MediaStream | null = null;
  try {
    const CaptureControllerCtor = (
      globalThis as unknown as { CaptureController?: new () => CaptureControllerLike }
    ).CaptureController;
    const controller = CaptureControllerCtor ? new CaptureControllerCtor() : undefined;

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
        frameRate: { ideal: frameRate, max: frameRate },
      } as MediaTrackConstraints,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      monitorTypeSurfaces: "exclude",
      surfaceSwitching: "exclude",
      audio: false,
      ...(controller ? { controller } : {}),
    } as DisplayMediaOptions);

    try {
      controller?.setFocusBehavior?.("no-focus-change");
    } catch {
      // Optional.
    }

    const track = stream.getVideoTracks()[0];
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
    if (settings.displaySurface && settings.displaySurface !== "browser") {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    try {
      await track.applyConstraints({
        frameRate: { ideal: frameRate, max: frameRate },
      });
    } catch {
      // Best-effort.
    }

    return stream;
  } catch {
    stream?.getTracks().forEach((t) => t.stop());
    return null;
  }
}

export async function openStageCapture(
  stage: HTMLElement,
  frameRate = CAPTURE_FRAME_RATE,
): Promise<CaptureSession | null> {
  if (!canUseRegionCapture()) return null;

  const stream = await openDisplayStream(frameRate);
  if (!stream) return null;

  const track = stream.getVideoTracks()[0];
  if (!track?.cropTo || !window.CropTarget) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  try {
    const cropTarget = await window.CropTarget.fromElement(stage);
    await track.cropTo(cropTarget);
    return {
      stream,
      stop: () => {
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
}

/** Wait after share-picker accept so the window can finish resizing before encode. */
export const POST_PERMISSION_RESIZE_MS = 1000;

/** One decoded video frame (or 2 rAF) + 2 display frames after the share picker. */
export async function settleBeforeEncode(stage: HTMLElement): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, POST_PERMISSION_RESIZE_MS);
  });

  // Live media (video or photo) may be on the stage fill or under #hud-display.
  const video =
    stage.querySelector<HTMLVideoElement>('[data-capture="backdrop"] video') ??
    stage.querySelector("video");

  if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (video.paused) void video.play().catch(() => {});
    if ("requestVideoFrameCallback" in video) {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        const handle = video.requestVideoFrameCallback(() => finish());
        window.setTimeout(() => {
          try {
            video.cancelVideoFrameCallback(handle);
          } catch {
            // ignore
          }
          finish();
        }, 500);
      });
    }
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
