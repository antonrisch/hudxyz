export {
  initPostHog,
  captureSanitizedPageview,
  syncPostHogMeasurementConsent,
} from "@/lib/analytics/client";
export {
  track,
  trackOnce,
  flushPendingAnalyticsEvents,
  getPendingAnalyticsEventCount,
} from "@/lib/analytics/track";
export { isPostHogEnabled } from "@/lib/analytics/enabled";
export type { AnalyticsIdentityMode } from "@/lib/analytics/identity";
export type {
  AnalyticsEventMap,
  AnalyticsEventName,
  SearchResultSource,
  SimulatorLoadFailureStage,
  SimulatorLoadSource,
  SimulatorLoadTrigger,
} from "@/lib/analytics/events";
