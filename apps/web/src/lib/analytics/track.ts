import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";
import { isPostHogEnabled } from "@/lib/analytics/enabled";
import { isAnalyticsConsentResolved } from "@/lib/analytics/identity";
import { stripDeniedAnalyticsProperties } from "@/lib/analytics/sanitize";

const PENDING_EVENT_LIMIT = 32;

type PendingEvent = {
  event: AnalyticsEventName;
  properties: AnalyticsEventMap[AnalyticsEventName];
  onceKey?: string;
};

let captureImpl:
  | (<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) => void)
  | null = null;
const trackedOnce = new Set<string>();
const pendingEvents: PendingEvent[] = [];

/** Wire the PostHog capture implementation after init (client-only). */
export function bindAnalyticsCapture(
  capture: <E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) => void,
): void {
  captureImpl = capture;
}

function emit<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]): void {
  if (!captureImpl) return;
  try {
    const safe = stripDeniedAnalyticsProperties(
      properties as Record<string, unknown>,
    ) as AnalyticsEventMap[E];
    captureImpl(event, safe);
  } catch {
    // Analytics must never break product flows.
  }
}

function enqueue(item: PendingEvent): void {
  if (pendingEvents.length >= PENDING_EVENT_LIMIT) {
    const dropped = pendingEvents.shift();
    // Allow trackOnce to retry if its queued event was evicted.
    if (dropped?.onceKey) trackedOnce.delete(dropped.onceKey);
  }
  pendingEvents.push(item);
}

/** Fire a typed product event. Queues until consent resolves; no-ops when disabled. */
export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
  onceKey?: string,
): void {
  if (!isPostHogEnabled()) {
    if (onceKey) trackedOnce.delete(onceKey);
    return;
  }

  if (!isAnalyticsConsentResolved()) {
    enqueue({ event, properties, onceKey });
    return;
  }

  if (!captureImpl) {
    if (onceKey) trackedOnce.delete(onceKey);
    return;
  }
  emit(event, properties);
}

/**
 * Flush product events that arrived before consent settled.
 * Call immediately after identity mode + PostHog consent are applied.
 */
export function flushPendingAnalyticsEvents(): void {
  if (!isPostHogEnabled() || !captureImpl || !isAnalyticsConsentResolved()) return;

  const queued = pendingEvents.splice(0, pendingEvents.length);
  for (const item of queued) {
    emit(item.event, item.properties);
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
  track(event, properties, key);
}

/** Current pre-consent queue depth (weekly telemetry QA / console inspection). */
export function getPendingAnalyticsEventCount(): number {
  return pendingEvents.length;
}

/** Test-only: clear capture binding, queue, and once-keys between cases. */
export function resetAnalyticsTrackForTests(): void {
  captureImpl = null;
  trackedOnce.clear();
  pendingEvents.length = 0;
}

/** @deprecated Prefer getPendingAnalyticsEventCount — kept for existing tests. */
export function getPendingAnalyticsEventCountForTests(): number {
  return getPendingAnalyticsEventCount();
}
