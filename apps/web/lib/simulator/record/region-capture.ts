/**
 * Display capture for the stage: getDisplayMedia + Region or Element crop/restrict.
 *
 * - region  → CropTarget.fromElement + track.cropTo (bounding box)
 * - element → RestrictionTarget.fromElement + track.restrictTo (DOM subtree only)
 *
 * Default production path is region. Element is a Chrome-oriented A/B toggle.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture
 */

import {
  CAPTURE_FRAME_RATE,
  type RecordCaptureMode,
} from "@/lib/simulator/record/config";

declare global {
  interface CropTarget {}
  interface RestrictionTarget {}
  interface Window {
    CropTarget?: { fromElement(element: Element): Promise<CropTarget> };
    RestrictionTarget?: { fromElement(element: Element): Promise<RestrictionTarget> };
  }
  interface MediaStreamTrack {
    cropTo?(target: CropTarget | null): Promise<void>;
    restrictTo?(target: RestrictionTarget | null): Promise<void>;
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

export type RegionCaptureSession = {
  stream: MediaStream;
  mode: RecordCaptureMode;
  stop: () => void;
};

export function canUseRegionCapture(): boolean {
  return (
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof window.CropTarget?.fromElement === "function"
  );
}

export function canUseElementCapture(): boolean {
  return (
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof window.RestrictionTarget?.fromElement === "function"
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
      // Keep "this tab" available — we self-capture the simulator.
      selfBrowserSurface: "include",
      // Chrome hints: fewer picker surfaces → often faster openMs (ignored elsewhere).
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

export async function openRegionCapture(
  stage: HTMLElement,
  mode: RecordCaptureMode = "region",
  frameRate = CAPTURE_FRAME_RATE,
): Promise<RegionCaptureSession | null> {
  const preferElement = mode === "element" && canUseElementCapture();
  const preferRegion = canUseRegionCapture();

  if (!preferElement && !preferRegion) return null;

  const stream = await openDisplayStream(frameRate);
  if (!stream) return null;

  const track = stream.getVideoTracks()[0];
  if (!track) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  try {
    if (preferElement && track.restrictTo && window.RestrictionTarget) {
      // Element Capture: only the stage DOM subtree (needs stacking context — see stage CSS).
      const target = await window.RestrictionTarget.fromElement(stage);
      await track.restrictTo(target);
      return {
        stream,
        mode: "element",
        stop: () => {
          stream.getTracks().forEach((t) => t.stop());
        },
      };
    }

    if (!track.cropTo || !window.CropTarget) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    const cropTarget = await window.CropTarget.fromElement(stage);
    await track.cropTo(cropTarget);
    return {
      stream,
      mode: "region",
      stop: () => {
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
}
