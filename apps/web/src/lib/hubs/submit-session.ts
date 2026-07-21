export const SUBMIT_SESSION_COOKIE = "hud_submit_session";

const SUBMIT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
const SUBMIT_SESSION_PAYLOAD = "submit";

function getSubmitSessionSecret(): string | null {
  const secret = process.env.SUBMIT_SESSION_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

export function isSubmitSessionConfigured(): boolean {
  return getSubmitSessionSecret() !== null;
}

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

async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(signature);
}

export async function mintSubmitSessionValue(): Promise<string | null> {
  const secret = getSubmitSessionSecret();
  if (!secret) return null;
  return signPayload(secret, SUBMIT_SESSION_PAYLOAD);
}

export async function verifySubmitSessionValue(value: string | undefined): Promise<boolean> {
  const secret = getSubmitSessionSecret();
  if (!secret || !value) return false;

  const expected = await signPayload(secret, SUBMIT_SESSION_PAYLOAD);
  const a = base64UrlToBytes(value);
  const b = base64UrlToBytes(expected);
  if (!a || !b) return false;
  return timingSafeEqual(a, b);
}

export function submitSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SUBMIT_SESSION_MAX_AGE_SECONDS,
  };
}
