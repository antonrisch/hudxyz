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

/** Exact property keys that must never leave the browser on product events. */
const DENYLIST_PROPERTY_KEYS = new Set([
  "url",
  "href",
  "host",
  "hostname",
  "origin",
  "query",
  "search",
  "hash",
  "pathname",
  "path",
  "app_url",
  "appUrl",
  "app_name",
  "appName",
  "deep_link",
  "deepLink",
  "device_deep_link",
  "deviceDeepLink",
  "launch_url",
  "launchUrl",
  "clipboard",
  "clipboard_text",
  "clipboardText",
  "file_name",
  "fileName",
  "filename",
  "mime_type",
  "mimeType",
  "blob_bytes",
  "blobBytes",
  "bytes",
  "image_url",
  "imageUrl",
  "thumb_url",
  "thumbUrl",
  "display_surface",
  "displaySurface",
]);

/** Catch renamed keys via camelCase ↔ snake_case normalization. */
function isDeniedPropertyKey(key: string): boolean {
  if (DENYLIST_PROPERTY_KEYS.has(key)) return true;
  // PostHog auto props are sanitized separately — never drop `$…` wholesale.
  if (key.startsWith("$")) return false;
  const snake = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return DENYLIST_PROPERTY_KEYS.has(snake);
}

function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(https?:|blob:|data:|fb-viewapp:)/i.test(trimmed)) return true;
  if (trimmed.startsWith("//")) return true;
  // Bare hostnames / host+path without scheme (e.g. app.example/foo).
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#]|$)/i.test(trimmed);
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return looksLikeUrl(value) ? undefined : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry)).filter((entry) => entry !== undefined);
  }
  if (typeof value === "object") {
    return stripDeniedAnalyticsProperties(value as Record<string, unknown>);
  }
  // Drop functions / symbols / etc.
  return undefined;
}

/**
 * Drop URL-shaped / content-bearing custom properties before capture.
 * Typed events should already exclude these; this is a defensive backstop.
 * Walks nested objects/arrays and denies both exact keys and URL-shaped values.
 */
export function stripDeniedAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  if (!properties) return sanitized;

  for (const [key, value] of Object.entries(properties)) {
    if (isDeniedPropertyKey(key)) continue;
    const next = sanitizeValue(value);
    if (next !== undefined) sanitized[key] = next;
  }
  return sanitized;
}

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
