import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";

/** Shared BotID gate for mutating public `/api/hubs/*` routes. */
export async function requireHumanOrNull(): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  return null;
}
