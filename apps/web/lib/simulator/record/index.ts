/**
 * Stage screen recording.
 *
 * Pipeline: getDisplayMedia → Region (default) or Element Capture → settle → MediaRecorder.
 */

export {
  CAPTURE_FRAME_RATE,
  DEFAULT_RECORD_CAPTURE_MODE,
  MAX_RECORD_MS,
  TIMESLICE_MS,
  VIDEO_BITRATE,
  type RecordCaptureMode,
} from "@/lib/simulator/record/config";
export { downloadStageRecording } from "@/lib/simulator/record/download";
export {
  createStageRecorder,
  type StageRecorder,
  type StageRecorderDeps,
} from "@/lib/simulator/record/controller";
export {
  canUseElementCapture,
  canUseRegionCapture,
} from "@/lib/simulator/record/region-capture";
