import { NextResponse } from "next/server";
import { createSession, liveViewUrl, releaseSession } from "@/lib/browserbase";
import { navigate, disconnect } from "@/lib/cdp";
import { checkCompat } from "@/lib/compat";

// playwright-core needs the node runtime, not edge
export const runtime = "nodejs";

// POST /api/emulator/session - mint a Browserbase session for an MRBD-compatible
// url, navigate to it, return the embeddable live-view url. body: { url }
export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({}));
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  // gate server-side before minting a paid session
  const compat = await checkCompat(url);
  if (!compat.compatible) {
    return NextResponse.json({ error: compat.reason ?? "not MRBD-compatible" }, { status: 422 });
  }
  try {
    const session = await createSession();
    await navigate(session.id, url);
    const live = await liveViewUrl(session.id);
    return NextResponse.json({ sessionId: session.id, liveViewUrl: live });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

// DELETE /api/emulator/session?id=... - release on idle/exit to stop the meter
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await disconnect(id);
  await releaseSession(id);
  return NextResponse.json({ ok: true });
}
