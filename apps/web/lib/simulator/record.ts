import { captureStageSnapdom } from "@/lib/simulator/capture";
import {
  drawStagePixelFrame,
  openStagePixelCapture,
  type PixelCaptureSession,
} from "@/lib/simulator/pixel-capture";

export const STAGE_RECORD_FPS = 30;
export const MAX_RECORD_MS = 5 * 60 * 1000; // 5 minutes

export type StageRecordDeps = {
  getStage: () => HTMLElement | null;
  getBackdrop: () => HTMLElement | null;
  getDisplay: () => HTMLElement | null;
  getIframe: () => HTMLIFrameElement | null;
  getAdditive?: () => boolean;
  onAutoStop?: (blob: Blob | null) => void;
};

export type StageRecorder = {
  readonly isRecording: boolean;
  start: () => void;
  stop: () => Promise<Blob | null>;
};

function pickRecorderMimeType(): string | undefined {
  const types = [
    "video/mp4;codecs=avc1.424028",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

export function downloadStageRecording(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  anchor.download = `mrbd-${stamp}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createStageRecorder(deps: StageRecordDeps): StageRecorder {
  let recording = false;
  let generation = 0;
  let frameId = 0;
  let capturing = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let pixelSession: PixelCaptureSession | null = null;

  const stopPixelSession = () => {
    pixelSession?.stop();
    pixelSession = null;
  };

  const drawPixelFrame = (gen: number) => {
    if (!recording || gen !== generation || !pixelSession || !canvas) return;
    drawStagePixelFrame(pixelSession.video, canvas);
  };

  const schedulePixelFrames = (gen: number) => {
    const tick = () => {
      if (!recording || gen !== generation) return;
      frameId = requestAnimationFrame(tick);
      drawPixelFrame(gen);
    };
    frameId = requestAnimationFrame(tick);
  };

  const drawSnapdomFrame = async (gen: number) => {
    const stage = deps.getStage();
    if (!stage || !recording || gen !== generation || !canvas || !ctx) return;

    const frame = await captureStageSnapdom(
      {
        stage,
        backdrop: deps.getBackdrop(),
        display: deps.getDisplay(),
        iframe: deps.getIframe(),
        additive: deps.getAdditive?.() ?? false,
      },
      { width: canvas.width, height: canvas.height },
    );
    if (!recording || gen !== generation || !frame) return;

    ctx.drawImage(frame, 0, 0);
  };

  const scheduleSnapdomFrames = (gen: number) => {
    const tick = () => {
      if (!recording || gen !== generation) return;
      frameId = requestAnimationFrame(tick);

      if (capturing) return;
      capturing = true;
      drawSnapdomFrame(gen).finally(() => {
        capturing = false;
      });
    };
    frameId = requestAnimationFrame(tick);
  };

  const stopRecording = (): Promise<Blob | null> => {
    if (!recording) return Promise.resolve(null);
    recording = false;
    generation += 1;
    cancelAnimationFrame(frameId);
    stopPixelSession();

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!recorder) return Promise.resolve(null);

    return new Promise((resolve) => {
      recorder!.onstop = () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        resolve(new Blob(chunks, { type: recorder!.mimeType || "video/webm" }));
      };
      recorder!.stop();
    });
  };

  return {
    get isRecording() {
      return recording;
    },

    start() {
      if (recording) return;
      const stage = deps.getStage();
      if (!stage) return;

      recording = true;
      generation += 1;
      const gen = generation;
      chunks = [];
      stopPixelSession();

      canvas = document.createElement("canvas");
      const { width, height } = stage.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d canvas context unavailable");

      const mimeType = pickRecorderMimeType();
      const stream = canvas.captureStream(STAGE_RECORD_FPS);
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      void (async () => {
        const session = await openStagePixelCapture(stage);
        if (!recording || gen !== generation) {
          session?.stop();
          return;
        }

        if (session) {
          pixelSession = session;
          recorder!.start(250);
          schedulePixelFrames(gen);
        } else {
          recorder!.start(250);
          scheduleSnapdomFrames(gen);
        }

        timeoutId = setTimeout(() => {
          if (recording && gen === generation) {
            void stopRecording().then((blob) => {
              deps.onAutoStop?.(blob);
            });
          }
        }, MAX_RECORD_MS);
      })();
    },

    stop: stopRecording,
  };
}
