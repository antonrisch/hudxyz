/**
 * Strip query/hash so search terms and simulator `?url=` never leave the browser.
 * Keep origin + pathname for route-level pageviews.
 */
function defaultAnalyticsOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://hudxyz.com";
}

export function sanitizeAnalyticsUrl(rawUrl: string, origin = defaultAnalyticsOrigin()): string {
  try {
    const url = new URL(rawUrl, origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return origin;
  }
}

export function sanitizeAnalyticsPath(rawUrl: string, origin = defaultAnalyticsOrigin()): string {
  try {
    return new URL(rawUrl, origin).pathname || "/";
  } catch {
    return "/";
  }
}

const URL_PROPERTY_KEYS = [
  "$current_url",
  "$initial_current_url",
  "$referrer",
  "$initial_referrer",
  "$session_entry_url",
  "$session_entry_referrer",
] as const;

/**
 * Sanitize URL properties PostHog adds automatically to every event.
 * Only strips query/hash from URL fields — leaves `$utm_*` acquisition
 * properties intact so inbound campaign tags (Reddit, Product Hunt) survive.
 */
export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const sanitized = { ...properties };

  for (const key of URL_PROPERTY_KEYS) {
    const value = sanitized[key];
    if (typeof value === "string" && (value.startsWith("http") || value.startsWith("/"))) {
      sanitized[key] = sanitizeAnalyticsUrl(value);
    }
  }

  const currentUrl = sanitized.$current_url;
  if (typeof currentUrl === "string") {
    sanitized.$pathname = sanitizeAnalyticsPath(currentUrl);
  }

  return sanitized;
}
