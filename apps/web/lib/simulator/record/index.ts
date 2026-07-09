/**
 * Stage screen recording.
 *
 * Pipeline: getDisplayMedia → Region Capture (CropTarget) → settle → MediaRecorder.
 * Display owns the HW backdrop <video>; this module only captures + encodes.
 */

import {
  CAPTURE_FRAME_RATE,
  openStageCapture,
  settleBeforeEncode,
  type CaptureSession,
} from "@/lib/simulator/record/capture";
import {
  MAX_RECORD_MS,
  VIDEO_BITRATE,
  createStreamEncoder,
  logRecord,
  type StreamEncoder,
} from "@/lib/simulator/record/encode";

export {
  CAPTURE_FRAME_RATE,
  canUseRegionCapture,
  openStageCapture,
} from "@/lib/simulator/record/capture";
export {
  MAX_RECORD_MS,
  VIDEO_BITRATE,
  TIMESLICE_MS,
  downloadStageRecording,
} from "@/lib/simulator/record/encode";

export type StageRecorder = {
  readonly isRecording: boolean;
  /** Opens capture, settles, then encodes. Resolves false if unavailable/denied. */
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
};

export type StageRecorderDeps = {
  getStage: () => HTMLElement | null;
  onAutoStop?: (blob: Blob | null) => void;
};

export function createStageRecorder(deps: StageRecorderDeps): StageRecorder {
  let recording = false;
  let generation = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let session: CaptureSession | null = null;
  let encoder: StreamEncoder | null = null;
  let startedAt = 0;

  const cleanupSession = () => {
    session?.stop();
    session = null;
  };

  const stopRecording = async (): Promise<Blob | null> => {
    if (!recording) return null;
    recording = false;
    generation += 1;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const elapsedMs = startedAt ? performance.now() - startedAt : 0;
    const active = encoder;
    encoder = null;
    cleanupSession();

    if (!active) {
      logRecord("stop", { elapsedMs: Math.round(elapsedMs), blobBytes: 0 });
      return null;
    }

    const blob = await active.stop();
    const sec = elapsedMs / 1000;
    logRecord("stop", {
      elapsedMs: Math.round(elapsedMs),
      mimeType: blob?.type ?? active.mimeType,
      blobBytes: blob?.size ?? 0,
      chunks: active.chunkCount,
      avgMbps: blob && sec > 0 ? Number(((blob.size * 8) / sec / 1e6).toFixed(2)) : null,
      targetMbps: VIDEO_BITRATE / 1e6,
    });
    return blob;
  };

  return {
    get isRecording() {
      return recording;
    },

    async start() {
      if (recording) return true;
      const stage = deps.getStage();
      if (!stage) return false;

      recording = true;
      generation += 1;
      const gen = generation;
      startedAt = 0;
      cleanupSession();
      encoder = null;

      const openStarted = performance.now();
      const opened = await openStageCapture(stage, CAPTURE_FRAME_RATE);
      if (!recording || gen !== generation) {
        opened?.stop();
        return false;
      }

      if (!opened) {
        recording = false;
        logRecord("start-failed", {
          reason: "capture-unavailable-or-denied",
          openMs: Math.round(performance.now() - openStarted),
        });
        return false;
      }

      session = opened;
      await settleBeforeEncode(stage);
      if (!recording || gen !== generation) {
        cleanupSession();
        return false;
      }

      encoder = createStreamEncoder(opened.stream);
      encoder.start();
      startedAt = performance.now();

      const track = opened.stream.getVideoTracks()[0];
      const settings = track?.getSettings() as MediaTrackSettings | undefined;
      logRecord("start", {
        openMs: Math.round(performance.now() - openStarted),
        mimeType: encoder.mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
        captureFps: CAPTURE_FRAME_RATE,
        track: track
          ? {
              width: settings?.width ?? null,
              height: settings?.height ?? null,
              frameRate: settings?.frameRate ?? null,
            }
          : null,
      });

      timeoutId = setTimeout(() => {
        if (recording && gen === generation) {
          void stopRecording().then((blob) => {
            deps.onAutoStop?.(blob);
          });
        }
      }, MAX_RECORD_MS);

      return true;
    },

    stop: stopRecording,
  };
}
