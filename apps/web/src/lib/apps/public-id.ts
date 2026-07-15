/** Crockford Base32 alphabet (lowercase), excluding i/l/o/u. */
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

export const PUBLIC_ID_LENGTH = 10;

/** Public app id: 10-char Crockford Base32. */
export const PUBLIC_ID_PATTERN = /^[0-9a-hjkmnp-tv-z]{10}$/;

export function isPublicId(value: string): boolean {
  return PUBLIC_ID_PATTERN.test(value);
}

/** Cryptographically random 10-char Crockford Base32 id. */
export function generatePublicId(): string {
  const bytes = new Uint8Array(PUBLIC_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += CROCKFORD[byte! & 31]!;
  }
  return out;
}

/** Listing path: `/apps/{slug}/{publicId}` — resolve by publicId; slug is cosmetic. */
export function listingPath(slug: string, publicId: string): string {
  return `/apps/${slug}/${publicId}`;
}
