// Recently loaded apps for the URL-bar dropdown. Client-only, localStorage-backed.

const STORAGE_KEY = "hud:simulator:recent-apps";
const MAX_RECENTS = 5;

export type RecentApp = {
  url: string;
  name: string;
};

function isRecentApp(value: unknown): value is RecentApp {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RecentApp).url === "string" &&
    typeof (value as RecentApp).name === "string"
  );
}

export function readRecentApps(): RecentApp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentApp).slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** Prepend an entry (dedup by url), cap the list, and persist. Returns the new list. */
export function pushRecentApp(entry: RecentApp): RecentApp[] {
  const next = [entry, ...readRecentApps().filter((item) => item.url !== entry.url)].slice(
    0,
    MAX_RECENTS,
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / disabled storage
    }
  }
  return next;
}
