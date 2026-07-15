import { NextResponse } from "next/server";
import { z } from "zod";

import { requireHumanOrNull } from "@/lib/apps/botid";
import { httpUrlSchema } from "@/lib/apps/http-url";
import { extractLaunchMetadata } from "@/lib/apps/launch-metadata";
import { SafeFetchError } from "@/lib/apps/safe-fetch";
import { clientIp, rateLimitOrNull, requireSubmitSession } from "@/lib/apps/submit-guard";

const bodySchema = z.object({
  url: httpUrlSchema(
    "Enter a valid Web App URL.",
    "Web App URL must start with http:// or https://",
  ),
});

/**
 * Scrape public HTML/manifest metadata for submit autofill.
 * POST /api/apps/metadata  body: `{ "url": "https://..." }`
 */
export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const limited = rateLimitOrNull(`metadata:${clientIp(request)}`, 20, 60_000);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const metadata = await extractLaunchMetadata(parsed.data.url);
    return NextResponse.json(metadata);
  } catch (error) {
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
