import posthog from "posthog-js";

import { isPostHogEnabled, postHogHost, postHogKey } from "@/lib/analytics/enabled";
import {
  identityModeFromMeasurementConsent,
  isAnalyticsConsentResolved,
  setAnalyticsIdentityMode,
} from "@/lib/analytics/identity";
import { enrichAnalyticsProperties } from "@/lib/analytics/enrich";
import { sanitizeAnalyticsPath, sanitizeAnalyticsUrl } from "@/lib/analytics/sanitize";
import { bindAnalyticsCapture } from "@/lib/analytics/track";

let initialized = false;
let initialPageviewSent = false;

/**
 * Cookieless-on-reject PostHog init. Safe to call once from instrumentation-client.
 * Defers the first pageview until c15t settles measurement consent.
 */
export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = postHogKey();
  if (!key || !isPostHogEnabled()) return;

  posthog.init(key, {
    api_host: postHogHost(),
    defaults: "2025-11-30",
    cookieless_mode: "on_reject",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    advanced_disable_flags: true,
    person_profiles: "never",
    before_send: (event) => {
      if (!event) return null;
      return {
        ...event,
        properties: enrichAnalyticsProperties(event.properties),
      };
    },
  });

  // Stay cookieless until c15t syncs measurement consent.
  posthog.opt_out_capturing();

  bindAnalyticsCapture((event, properties) => {
    if (!isAnalyticsConsentResolved()) return;
    posthog.capture(event, properties);
  });

  initialized = true;
}

/**
 * Apply c15t measurement consent to PostHog and emit the first pageview once.
 * Granted → persistent cookies; declined/pending → cookieless capture.
 */
export function syncPostHogMeasurementConsent(hasMeasurementConsent: boolean): void {
  if (typeof window === "undefined") return;
  if (!initialized) initPostHog();

  const mode = identityModeFromMeasurementConsent(hasMeasurementConsent);
  setAnalyticsIdentityMode(mode);

  if (initialized && isPostHogEnabled()) {
    try {
      if (hasMeasurementConsent) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    } catch {
      // ignore
    }
  }

  // Gate once per page load even if PostHog is unavailable, so consent changes
  // never enqueue a second "initial" pageview later.
  if (!initialPageviewSent) {
    initialPageviewSent = true;
    if (initialized && isPostHogEnabled()) {
      captureSanitizedPageview(window.location.href);
    }
  }
}

/** Whether the deferred first pageview has already been emitted this page load. */
export function hasEmittedInitialAnalyticsPageview(): boolean {
  return initialPageviewSent;
}

/** Test-only: clear init + first-pageview gate between cases. */
export function resetPostHogClientForTests(): void {
  initialized = false;
  initialPageviewSent = false;
}

/** Pathname-only pageview; never include query strings. */
export function captureSanitizedPageview(rawUrl: string): void {
  if (!initialized || !isPostHogEnabled() || !isAnalyticsConsentResolved()) return;

  const currentUrl = sanitizeAnalyticsUrl(rawUrl);
  const pathname = sanitizeAnalyticsPath(rawUrl);

  try {
    posthog.capture("$pageview", {
      $current_url: currentUrl,
      $pathname: pathname,
    });
  } catch {
    // ignore
  }
}
