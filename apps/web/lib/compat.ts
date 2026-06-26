// MRBD-compatibility gate (server-only): allow a url only if its page declares
// <meta name="mrbd-web-app-capable" content="yes">; also reads framing headers for transport.

export type Compat = {
  compatible: boolean;
  frameable: boolean;
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

// gating parked: allow every site through until we decide strictness. probe still
// runs so transport routing works; flip to true to block on the mrbd meta.
const ENFORCE_COMPAT = false;

// compatibility rarely changes; cache to dedupe the client check + server re-gate
// and rapid reloads.
const cache = new Map<string, { at: number; compat: Compat }>();
const TTL = 60_000;

async function probe(raw: string): Promise<Compat> {
  let url: URL;
  try {
    url = assertFetchable(raw);
  } catch (e) {
    return { compatible: false, frameable: false, reason: String((e as Error).message) };
  }
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Lenswolf-MRBD-emulator" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { compatible: false, frameable: false, reason: "site is unreachable" };
  }
  const xfo = (res.headers.get("x-frame-options") ?? "").toLowerCase();
  const csp = (res.headers.get("content-security-policy") ?? "").toLowerCase();
  // any frame-ancestors directive almost always excludes us -> treat as blocked
  const frameable = !(xfo.includes("deny") || xfo.includes("sameorigin") || csp.includes("frame-ancestors"));
  const compatible = hasCapableMeta(await res.text());
  return { compatible, frameable, reason: compatible ? undefined : "missing mrbd-web-app-capable meta tag" };
}

export async function checkCompat(raw: string): Promise<Compat> {
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < TTL) return hit.compat;
  const probed = await probe(raw);
  // allowlist everything until we decide on strictness; keep frameable for routing
  const compat = ENFORCE_COMPAT ? probed : { ...probed, compatible: true, reason: undefined };
  cache.set(raw, { at: Date.now(), compat });
  return compat;
}
