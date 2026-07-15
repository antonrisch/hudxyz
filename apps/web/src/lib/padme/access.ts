import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { REVIEW_COOKIE_NAME, verifyReviewCookieValue } from "@/lib/padme/auth";

/** Padme pages: missing/invalid review cookie → Next.js `notFound()`. */
export async function requirePadmeAccess(): Promise<void> {
  const cookieStore = await cookies();
  const unlocked = await verifyReviewCookieValue(cookieStore.get(REVIEW_COOKIE_NAME)?.value);
  if (!unlocked) notFound();
}
