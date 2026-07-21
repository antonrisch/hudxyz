import type { ScreenRecordStopReason } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { downloadStageRecording } from "@/lib/simulator/record/encode";

/** Emit completed only when a non-empty recording blob is available; otherwise failed/encode. */
export function finishScreenRecordAnalytics(input: {
  blob: Blob | null | undefined;
  duration_ms: number;
  stop_reason: ScreenRecordStopReason;
}): void {
  const blob = input.blob;
  if (!blob || blob.size <= 0) {
    track("screen_record_failed", { reason: "encode" });
    return;
  }

  try {
    downloadStageRecording(blob);
    track("screen_record_completed", {
      stop_reason: input.stop_reason,
      duration_ms: input.duration_ms,
    });
  } catch {
    track("screen_record_failed", { reason: "encode" });
  }
}
