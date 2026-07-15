import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";
import { isPostHogEnabled } from "@/lib/analytics/enabled";
import { isAnalyticsConsentResolved } from "@/lib/analytics/identity";

let captureImpl:
  | (<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) => void)
  | null = null;
const trackedOnce = new Set<string>();

/** Wire the PostHog capture implementation after init (client-only). */
export function bindAnalyticsCapture(
  capture: <E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) => void,
): void {
  captureImpl = capture;
}

/** Fire a typed product event. No-ops when PostHog is unavailable. */
export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (!isPostHogEnabled() || !captureImpl || !isAnalyticsConsentResolved()) return;
  try {
    captureImpl(event, properties);
  } catch {
    // Analytics must never break product flows.
  }
}

/** Track the first successful occurrence for a stable client-session key. */
export function trackOnce<E extends AnalyticsEventName>(
  key: string,
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (trackedOnce.has(key)) return;
  trackedOnce.add(key);
  track(event, properties);
}

/** Test-only: clear capture binding and once-keys between cases. */
export function resetAnalyticsTrackForTests(): void {
  captureImpl = null;
  trackedOnce.clear();
}
