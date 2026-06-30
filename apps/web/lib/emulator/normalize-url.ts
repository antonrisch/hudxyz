const WEB_PROTOCOLS = new Set(["http:", "https:"]);

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WEBSITE_HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

// parse address-bar input into an http(s) href; prepends https:// when no scheme is given.
export function normalizeWebUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed)
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!WEB_PROTOCOLS.has(url.protocol)) return null;
    if (!WEBSITE_HOSTNAME.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
