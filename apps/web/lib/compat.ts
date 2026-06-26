// MRBD-compatibility gate (server-only): allow a url only if its page declares
// <meta name="mrbd-web-app-capable" content="yes">.

export type Compat = {
  compatible: boolean;
  reason?: string;
};

// SSRF guard: http(s) only; private/loopback blocked in prod, allowed in dev.
// best-effort hostname screen, not DNS-rebinding-proof.
export function assertFetchable(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("only http(s) urls are allowed");
  }
  const host = u.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  const privateRange =
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith("169.254."); // link-local / cloud metadata
  if ((local || privateRange) && process.env.NODE_ENV === "production") {
    throw new Error("private hosts are not allowed");
  }
  return u;
}

// match <meta name="mrbd-web-app-capable" content="yes"> regardless of attr order
const hasCapableMeta = (html: string): boolean =>
  (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (m) => /name=["']?mrbd-web-app-capable["']?/i.test(m) && /content=["']?yes["']?/i.test(m),
  );

// gating parked: allow every site through until we decide strictness; flip to true
// to block on the mrbd-web-app-capable meta.
const ENFORCE_COMPAT: boolean = false;

// dedupe rapid reloads of the same url within TTL
const cache = new Map<string, { at: number; compat: Compat }>();
const TTL = 60_000;

async function probe(raw: string): Promise<Compat> {
  let url: URL;
  try {
    url = assertFetchable(raw);
  } catch (e) {
    return { compatible: false, reason: String((e as Error).message) };
  }
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Lenswolf-MRBD-emulator" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { compatible: false, reason: "site is unreachable" };
  }
  const compatible = hasCapableMeta(await res.text());
  return { compatible, reason: compatible ? undefined : "missing mrbd-web-app-capable meta tag" };
}

export async function checkCompat(raw: string): Promise<Compat> {
  if (!ENFORCE_COMPAT) return { compatible: true };
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < TTL) return hit.compat;
  const compat = await probe(raw);
  cache.set(raw, { at: Date.now(), compat });
  return compat;
}
