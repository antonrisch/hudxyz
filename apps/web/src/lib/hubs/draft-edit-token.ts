/** Per-draft edit capability: raw token in HttpOnly cookie, only hash in DB. */

const DRAFT_EDIT_COOKIE_PREFIX = "hud_draft_";
const DRAFT_EDIT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const bin = atob(padded + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function draftEditCookieName(publicId: string): string {
  return `${DRAFT_EDIT_COOKIE_PREFIX}${publicId}`;
}

export function mintDraftEditToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(bytes.buffer);
}

export async function hashDraftEditToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64Url(digest);
}

export async function verifyDraftEditToken(
  storedHash: string | null | undefined,
  candidate: string | undefined,
): Promise<boolean> {
  if (!storedHash || !candidate) return false;
  const candidateHash = await hashDraftEditToken(candidate);
  const a = base64UrlToBytes(storedHash);
  const b = base64UrlToBytes(candidateHash);
  if (!a || !b) return false;
  return timingSafeEqual(a, b);
}

export function readDraftEditTokenFromCookieHeader(
  cookieHeader: string | null,
  publicId: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const name = draftEditCookieName(publicId);
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function draftEditCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: DRAFT_EDIT_MAX_AGE_SECONDS,
  };
}
