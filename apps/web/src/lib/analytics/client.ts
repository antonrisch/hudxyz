import posthog from "posthog-js";

import { isPostHogEnabled, postHogHost, postHogKey } from "@/lib/analytics/enabled";
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
} from "@/lib/analytics/sanitize";
import { bindAnalyticsCapture } from "@/lib/analytics/track";

let initialized = false;

/** Cookieless PostHog init. Safe to call once from instrumentation-client. */
export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = postHogKey();
  if (!key || !isPostHogEnabled()) return;

  posthog.init(key, {
    api_host: postHogHost(),
    defaults: "2025-11-30",
    cookieless_mode: "always",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    advanced_disable_flags: true,
    person_profiles: "never",
    persistence: "memory",
    before_send: (event) => {
      if (!event) return null;
      return {
        ...event,
        properties: sanitizeAnalyticsProperties(event.properties),
      };
    },
  });

  bindAnalyticsCapture((event, properties) => {
    posthog.capture(event, properties);
  });

  initialized = true;
  captureSanitizedPageview(window.location.href);
}

/** Pathname-only pageview; never include query strings. */
export function captureSanitizedPageview(rawUrl: string): void {
  if (!initialized || !isPostHogEnabled()) return;

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
