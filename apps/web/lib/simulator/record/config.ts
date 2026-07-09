/**
 * Stage recording — smooth Path A (Region / Element Capture).
 * Painted stage pixels are the source of truth; encode budget stays modest so
 * interaction + capture + encode don't fight the main thread / GPU.
 */

/** Max clip length before auto-stop. */
export const MAX_RECORD_MS = 5 * 60 * 1000;

/** Encode budget — lower than "max quality" to keep interaction responsive while recording. */
export const VIDEO_BITRATE = 12_000_000;

/** MediaRecorder timeslice — larger = fewer main-thread chunk callbacks. */
export const TIMESLICE_MS = 1000;

/** Cap capture track at 30fps (ideal + max). getDisplayMedia forbids exact/min. */
export const CAPTURE_FRAME_RATE = 30;

export type RecordCaptureMode = "region" | "element";

/** Default: Region Capture (CropTarget) — wider Chrome support; Element is opt-in for A/B. */
export const DEFAULT_RECORD_CAPTURE_MODE: RecordCaptureMode = "region";

export const LOG_PREFIX = "[mrbd:record]";
