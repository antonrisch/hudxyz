import type { SuggestedHub } from "@/lib/simulator/config";
import { normalizeWebUrl } from "@/lib/simulator/search-params";

/**
 * Match key that treats http/https and trailing-slash pathname variants as the same hub.
 * Host + path + search only — scheme and a trailing `/` on the path do not distinguish.
 */
function suggestedHubMatchKey(href: string): string | null {
  try {
    const url = new URL(href);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return `${url.hostname.toLowerCase()}${pathname}${url.search}`;
  } catch {
    return null;
  }
}

/** Friendly suggested-hub name when `rawUrl` matches a hub (scheme / trailing-slash tolerant). */
export function suggestedHubNameForUrl(
  rawUrl: string,
  suggestedHubs: readonly SuggestedHub[],
): string {
  const href = normalizeWebUrl(rawUrl);
  if (!href) return "";
  const key = suggestedHubMatchKey(href);
  if (!key) return "";

  for (const hub of suggestedHubs) {
    const hubHref = normalizeWebUrl(hub.url);
    if (!hubHref) continue;
    if (suggestedHubMatchKey(hubHref) === key) return hub.name;
  }
  return "";
}
