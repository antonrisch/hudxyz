/** MediaRecorder encode + download helpers. */

export const MAX_RECORD_MS = 5 * 60 * 1000;
export const VIDEO_BITRATE = 12_000_000;
export const TIMESLICE_MS = 1000;

const LOG = "[mrbd:record]";

export function logRecord(...args: unknown[]) {
  console.info(LOG, ...args);
}

function pickMimeType(): string | undefined {
  // Prefer avc3 over avc1: Region Capture can change resolution mid-record, and
  // avc1 forbids in-band SPS/PPS updates (Chrome warns + often freezes the file).
  const types = [
    "video/mp4;codecs=avc3.424028",
    "video/mp4;codecs=avc3",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

export type StreamEncoder = {
  mimeType: string;
  start: () => void;
  stop: () => Promise<Blob | null>;
  readonly chunkBytes: number;
  readonly chunkCount: number;
};

export function createStreamEncoder(stream: MediaStream): StreamEncoder {
  const picked = pickMimeType();
  const mimeType = picked ?? "video/webm";
  const options: MediaRecorderOptions = { videoBitsPerSecond: VIDEO_BITRATE };
  if (picked) options.mimeType = picked;

  const chunks: Blob[] = [];
  let chunkBytes = 0;
  const recorder = new MediaRecorder(stream, options);

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
      chunkBytes += event.data.size;
    }
  };

  return {
    mimeType,
    get chunkBytes() {
      return chunkBytes;
    },
    get chunkCount() {
      return chunks.length;
    },
    start() {
      recorder.start(TIMESLICE_MS);
    },
    stop() {
      if (recorder.state === "inactive") return Promise.resolve(null);
      return new Promise((resolve) => {
        recorder.onstop = () => {
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
        };
        recorder.stop();
      });
    },
  };
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
