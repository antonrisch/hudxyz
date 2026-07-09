/**
 * Stage recorder — Region Capture (default) or Element Capture (dev A/B).
 *
 * Sequence: open capture → settle → MediaRecorder.start.
 * No SnapDOM fallback — if capture is unavailable/denied, start fails cleanly.
 */

import {
  CAPTURE_FRAME_RATE,
  MAX_RECORD_MS,
  TIMESLICE_MS,
  VIDEO_BITRATE,
  type RecordCaptureMode,
} from "@/lib/simulator/record/config";
import { createStreamEncoder, type StreamEncoder } from "@/lib/simulator/record/encode";
import { logRecord, trackCaptureInfo } from "@/lib/simulator/record/log";
import {
  openRegionCapture,
  type RegionCaptureSession,
} from "@/lib/simulator/record/region-capture";
import { settleBeforeEncode } from "@/lib/simulator/record/settle";

export type StageRecorder = {
  readonly isRecording: boolean;
  /** Opens capture, settles, then encodes. Resolves false if capture unavailable/denied. */
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
};

export type StageRecorderDeps = {
  getStage: () => HTMLElement | null;
  /** region (default) | element — element falls back to region if unsupported. */
  getCaptureMode?: () => RecordCaptureMode;
  getVideoBg?: () => boolean;
  getAdditive?: () => boolean;
  onAutoStop?: (blob: Blob | null) => void;
};

export function createStageRecorder(deps: StageRecorderDeps): StageRecorder {
  let recording = false;
  let generation = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let session: RegionCaptureSession | null = null;
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
    const path = session?.mode ?? null;
    encoder = null;
    cleanupSession();

    if (!active) {
      logRecord("stop", { path, elapsedMs: Math.round(elapsedMs), blobBytes: 0 });
      return null;
    }

    const blob = await active.stop();
    const sec = elapsedMs / 1000;
    logRecord("stop", {
      path,
      elapsedMs: Math.round(elapsedMs),
      mimeType: blob?.type ?? active.mimeType,
      blobBytes: blob?.size ?? 0,
      chunks: active.chunkCount,
      chunkBytes: active.chunkBytes,
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

      const requestedMode = deps.getCaptureMode?.() ?? "region";
      const openStarted = performance.now();
      const opened = await openRegionCapture(stage, requestedMode, CAPTURE_FRAME_RATE);
      if (!recording || gen !== generation) {
        opened?.stop();
        return false;
      }

      if (!opened) {
        recording = false;
        logRecord("start-failed", {
          reason: "capture-unavailable-or-denied",
          requestedMode,
          openMs: Math.round(performance.now() - openStarted),
        });
        return false;
      }

      const openMs = Math.round(performance.now() - openStarted);
      session = opened;

      const { leader, settleMs } = await settleBeforeEncode(stage);
      if (!recording || gen !== generation) {
        cleanupSession();
        return false;
      }

      encoder = createStreamEncoder(opened.stream);
      encoder.start();
      startedAt = performance.now();

      logRecord("start", {
        path: opened.mode,
        requestedMode,
        openMs,
        settleMs,
        mimeType: encoder.mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
        timesliceMs: TIMESLICE_MS,
        captureFps: CAPTURE_FRAME_RATE,
        videoBg: deps.getVideoBg?.() ?? false,
        additive: deps.getAdditive?.() ?? false,
        leaderReady: Boolean(leader),
        previewVideo: false,
        track: trackCaptureInfo(opened.stream),
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
