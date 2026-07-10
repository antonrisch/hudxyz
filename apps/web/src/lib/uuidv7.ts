const UUID_V7_VERSION = 0x70;
const UUID_VARIANT = 0x80;

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** RFC 9562 UUID version 7 (time-ordered, 48-bit unix-ms prefix). */
export function uuidv7(date = new Date()): string {
  const bytes = new Uint8Array(16);
  const timestamp = BigInt(date.getTime());

  bytes[0] = Number((timestamp >> BigInt(40)) & BigInt(0xff));
  bytes[1] = Number((timestamp >> BigInt(32)) & BigInt(0xff));
  bytes[2] = Number((timestamp >> BigInt(24)) & BigInt(0xff));
  bytes[3] = Number((timestamp >> BigInt(16)) & BigInt(0xff));
  bytes[4] = Number((timestamp >> BigInt(8)) & BigInt(0xff));
  bytes[5] = Number(timestamp & BigInt(0xff));

  crypto.getRandomValues(bytes.subarray(6, 16));
  bytes[6] = (bytes[6]! & 0x0f) | UUID_V7_VERSION;
  bytes[8] = (bytes[8]! & 0x3f) | UUID_VARIANT;

  return formatUuid(bytes);
}
