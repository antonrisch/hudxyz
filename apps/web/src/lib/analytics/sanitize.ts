/**
 * Strip query/hash so search terms and simulator `?url=` never leave the browser.
 * Keep origin + pathname for route-level pageviews.
 */
export function sanitizeAnalyticsUrl(rawUrl: string, origin = window.location.origin): string {
  try {
    const url = new URL(rawUrl, origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return origin;
  }
}

export function sanitizeAnalyticsPath(rawUrl: string, origin = window.location.origin): string {
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

/** Sanitize URL properties PostHog adds automatically to every event. */
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
