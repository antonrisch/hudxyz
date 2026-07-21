/**
 * Stage screen recording.
 *
 * Pipeline: getDisplayMedia → Region Capture (CropTarget) → settle → MediaRecorder.
 * Display owns the HW backdrop <video>; this module only captures + encodes.
 */

import {
  CAPTURE_FRAME_RATE,
  canUseRegionCapture,
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
import type { ScreenRecordFailReason } from "@/lib/analytics/events";

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

export type StageRecordStopMeta = {
  duration_ms: number;
  blob: Blob | null;
};

export type StageRecordStartResult = { ok: true } | { ok: false; reason: ScreenRecordFailReason };

export type StageRecordStopResult = {
  blob: Blob | null;
  duration_ms: number;
};

export type StageRecordStartOptions = {
  /** Runs after display permission is granted, before settle/encode. Return false to abort. */
  afterPermission?: () => Promise<boolean>;
};

export type StageRecorder = {
  readonly isRecording: boolean;
  /** Opens capture, optional after-permission hook, settles, then encodes. */
  start: (options?: StageRecordStartOptions) => Promise<StageRecordStartResult>;
  stop: () => Promise<StageRecordStopResult | null>;
};

export type StageRecorderDeps = {
  getStage: () => HTMLElement | null;
  onAutoStop?: (meta: StageRecordStopMeta) => void;
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

  const stopRecording = async (): Promise<StageRecordStopResult | null> => {
    if (!recording) return null;
    recording = false;
    generation += 1;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const elapsedMs = startedAt ? performance.now() - startedAt : 0;
    const duration_ms = Math.max(0, Math.round(elapsedMs));
    const active = encoder;
    encoder = null;
    cleanupSession();

    if (!active) {
      logRecord("stop", { elapsedMs: duration_ms, blobBytes: 0 });
      return { blob: null, duration_ms };
    }

    const blob = await active.stop();
    const sec = elapsedMs / 1000;
    logRecord("stop", {
      elapsedMs: duration_ms,
      mimeType: blob?.type ?? active.mimeType,
      blobBytes: blob?.size ?? 0,
      chunks: active.chunkCount,
      avgMbps: blob && sec > 0 ? Number(((blob.size * 8) / sec / 1e6).toFixed(2)) : null,
      targetMbps: VIDEO_BITRATE / 1e6,
    });
    return { blob, duration_ms };
  };

  return {
    get isRecording() {
      return recording;
    },

    async start(options?: StageRecordStartOptions) {
      if (recording) return { ok: true };
      const stage = deps.getStage();
      if (!stage) return { ok: false, reason: "unsupported" };

      if (!canUseRegionCapture()) {
        return { ok: false, reason: "unsupported" };
      }

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
        return { ok: false, reason: "aborted" };
      }

      if (!opened) {
        recording = false;
        logRecord("start-failed", {
          reason: "capture-unavailable-or-denied",
          openMs: Math.round(performance.now() - openStarted),
        });
        return { ok: false, reason: "denied" };
      }

      session = opened;

      if (options?.afterPermission) {
        const cont = await options.afterPermission();
        if (!cont || !recording || gen !== generation) {
          recording = false;
          cleanupSession();
          return { ok: false, reason: "aborted" };
        }
      }

      await settleBeforeEncode(stage);
      if (!recording || gen !== generation) {
        cleanupSession();
        return { ok: false, reason: "aborted" };
      }

      encoder = createStreamEncoder(opened.stream);
      encoder.start();
      startedAt = performance.now();

      const mediaTrack = opened.stream.getVideoTracks()[0];
      const settings = mediaTrack?.getSettings() as MediaTrackSettings | undefined;
      logRecord("start", {
        openMs: Math.round(performance.now() - openStarted),
        mimeType: encoder.mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
        captureFps: CAPTURE_FRAME_RATE,
        track: mediaTrack
          ? {
              width: settings?.width ?? null,
              height: settings?.height ?? null,
              frameRate: settings?.frameRate ?? null,
            }
          : null,
      });

      timeoutId = setTimeout(() => {
        if (recording && gen === generation) {
          void stopRecording().then((result) => {
            deps.onAutoStop?.({
              blob: result?.blob ?? null,
              duration_ms: result?.duration_ms ?? 0,
            });
          });
        }
      }, MAX_RECORD_MS);

      return { ok: true };
    },

    stop: stopRecording,
  };
}
