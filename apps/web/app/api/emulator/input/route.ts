import { NextResponse } from "next/server";
import { pressKey } from "@/lib/cdp";

export const runtime = "nodejs";

// the device reliably emits only these; reject everything else so the endpoint
// can't be abused to type arbitrary text into the remote browser.
const ALLOWED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Escape",
]);

// POST /api/emulator/input - dispatch one d-pad key into a session.
// body: { sessionId, key }
export async function POST(req: Request) {
  const { sessionId, key } = await req.json().catch(() => ({}));
  if (!sessionId || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  }
  try {
    await pressKey(sessionId, key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
