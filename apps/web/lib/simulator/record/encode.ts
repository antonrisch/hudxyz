import { TIMESLICE_MS, VIDEO_BITRATE } from "@/lib/simulator/record/config";

export function pickRecorderMimeType(): string | undefined {
  // Quality-first: VP9 when available, then VP8, then MP4.
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/mp4;codecs=avc1.424028",
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
  const picked = pickRecorderMimeType();
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
