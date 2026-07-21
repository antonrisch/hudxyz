export {
  initPostHog,
  captureSanitizedPageview,
  syncPostHogMeasurementConsent,
} from "@/lib/analytics/client";
export { track } from "@/lib/analytics/track";
export { isPostHogEnabled } from "@/lib/analytics/enabled";
export type { AnalyticsIdentityMode } from "@/lib/analytics/identity";
export type {
  AnalyticsEventMap,
  AnalyticsEventName,
  SearchResultSource,
  SimulatorLoadSource,
} from "@/lib/analytics/events";
