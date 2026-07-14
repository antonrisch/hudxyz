import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

export class SafeFetchError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SafeFetchError";
    this.status = status;
  }
}

export type SafeFetchResult = {
  url: string;
  contentType: string | null;
  body: Uint8Array;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 1_048_576; // 1 MB

type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Expand a (possibly compressed) IPv6 address into 8 hextets. */
function expandIpv6Hextets(ip: string): number[] | null {
  const lower = ip.toLowerCase();
  if (lower.includes(".")) {
    // IPv4-mapped / embedded — handled separately before calling this for pure v6 checks
    return null;
  }
  const [head, tail] = lower.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  if (lower.includes("::")) {
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) return null;
    const parts = [...headParts, ...Array.from({ length: missing }, () => "0"), ...tailParts];
    if (parts.length !== 8) return null;
    return parts.map((part) => Number.parseInt(part || "0", 16));
  }
  const parts = lower.split(":");
  if (parts.length !== 8) return null;
  return parts.map((part) => Number.parseInt(part || "0", 16));
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;

  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);

  // IPv4-mapped with hex (::ffff:AABB:CCDD)
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = Number.parseInt(mappedHex[1]!, 16);
    const lo = Number.parseInt(mappedHex[2]!, 16);
    const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIpv4(v4);
  }

  const hextets = expandIpv6Hextets(normalized);
  if (!hextets) {
    // Fail closed on unparseable forms
    return true;
  }

  const [h0, h1, h2, h3] = hextets;

  // Multicast ff00::/8
  if ((h0 & 0xff00) === 0xff00) return true;

  // Link-local fe80::/10
  if ((h0 & 0xffc0) === 0xfe80) return true;

  // ULA fc00::/7
  if ((h0 & 0xfe00) === 0xfc00) return true;

  // NAT64 64:ff9b::/96
  if (h0 === 0x64 && h1 === 0xff9b && h2 === 0 && h3 === 0) return true;

  // 6to4 2002::/16
  if (h0 === 0x2002) return true;

  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchError("URL must start with http:// or https://");
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new SafeFetchError("Only ports 80 and 443 are allowed.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new SafeFetchError("That host is not allowed.");
  }

  const literalVersion = isIP(url.hostname);
  if (literalVersion !== 0 && isBlockedIp(url.hostname)) {
    throw new SafeFetchError("That host is not allowed.");
  }

  return url;
}

/**
 * Resolve hostname and return the first public address. Callers must connect
 * using this address (pin) so DNS cannot flip to a private IP after the check.
 */
async function resolvePublicAddress(hostname: string): Promise<ResolvedAddress> {
  const literal = isIP(hostname);
  if (literal === 4 || literal === 6) {
    if (isBlockedIp(hostname)) {
      throw new SafeFetchError("That host is not allowed.");
    }
    return { address: hostname, family: literal };
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchError("Could not resolve that host.", 400);
  }

  if (addresses.length === 0) {
    throw new SafeFetchError("Could not resolve that host.", 400);
  }

  for (const entry of addresses) {
    if (!isBlockedIp(entry.address) && (entry.family === 4 || entry.family === 6)) {
      return { address: entry.address, family: entry.family };
    }
  }

  throw new SafeFetchError("That host is not allowed.");
}

function readBodyCapped(
  stream: http.IncomingMessage,
  maxBytes: number,
  contentLengthHeader: string | undefined,
): Promise<Uint8Array> {
  if (contentLengthHeader) {
    const length = Number(contentLengthHeader);
    if (Number.isFinite(length) && length > maxBytes) {
      stream.resume();
      return Promise.reject(new SafeFetchError("Response is too large.", 422));
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      stream.destroy();
      reject(error);
    };

    stream.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      total += buf.byteLength;
      if (total > maxBytes) {
        fail(new SafeFetchError("Response is too large.", 422));
        return;
      }
      chunks.push(buf);
    });

    stream.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });

    stream.on("error", (error) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

type PinnedResponse = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Uint8Array;
};

/**
 * Connect to the pre-resolved public IP while sending the original Host /
 * TLS SNI so DNS rebinding cannot retarget the socket after the SSRF check.
 */
function pinnedRequest(
  url: URL,
  pinned: ResolvedAddress,
  options: { timeoutMs: number; accept: string; maxBytes: number; signal?: AbortSignal },
): Promise<PinnedResponse> {
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        host: pinned.address,
        family: pinned.family,
        servername: isHttps ? url.hostname : undefined,
        port,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          Host: url.host,
          Accept: options.accept,
          "User-Agent": "hudxyz-submit-autofill/1.0",
          Connection: "close",
        },
        timeout: options.timeoutMs,
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;

        // Redirects: discard body; only Location matters.
        if (statusCode >= 300 && statusCode < 400) {
          res.resume();
          resolve({
            statusCode,
            headers: res.headers,
            body: new Uint8Array(),
          });
          return;
        }

        readBodyCapped(res, options.maxBytes, headerValue(res.headers["content-length"]))
          .then((body) => {
            resolve({
              statusCode,
              headers: res.headers,
              body,
            });
          })
          .catch(reject);
      },
    );

    const onAbort = () => {
      req.destroy();
      reject(new SafeFetchError("Request timed out.", 408));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    req.on("timeout", () => {
      req.destroy();
      reject(new SafeFetchError("Request timed out.", 408));
    });

    req.on("error", (error) => {
      if (error instanceof SafeFetchError) {
        reject(error);
        return;
      }
      reject(new SafeFetchError("Could not fetch that URL.", 502));
    });

    req.end();
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
};

/**
 * Fetch a public http(s) URL with SSRF guards: ports 80/443 only, no private
 * resolved IPs (pinned for the TCP connect), redirect re-validation, timeout,
 * and body size cap.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const accept = options.accept ?? "*/*";

  let current = assertAllowedUrl(rawUrl);

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const pinned = await resolvePublicAddress(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: PinnedResponse;
    try {
      // Fetch without body cap first so we can read Location on redirects without
      // downloading a huge error body; enforce maxBytes on the final response.
      response = await pinnedRequest(current, pinned, {
        timeoutMs,
        accept,
        maxBytes,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = headerValue(response.headers.location);
      if (!location) {
        throw new SafeFetchError("Redirect missing Location header.", 502);
      }
      if (redirect >= maxRedirects) {
        throw new SafeFetchError("Too many redirects.", 422);
      }
      current = assertAllowedUrl(new URL(location, current).toString());
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new SafeFetchError(`Upstream returned ${response.statusCode}.`, 502);
    }

    return {
      url: current.toString(),
      contentType: headerValue(response.headers["content-type"]) ?? null,
      body: response.body,
    };
  }

  throw new SafeFetchError("Too many redirects.", 422);
}

export function decodeUtf8Body(body: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}

/**
 * Detect JPEG / PNG / WebP from magic bytes. Returns null for anything else
 * (including SVG/ICO masquerading behind a friendly Content-Type).
 */
export function detectImageContentType(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
