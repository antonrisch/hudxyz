import { NextResponse, type NextRequest } from "next/server";

import {
  REVIEW_COOKIE_NAME,
  matchesReviewSecret,
  mintReviewCookieValue,
  reviewCookieOptions,
  verifyReviewCookieValue,
} from "@/lib/padme/auth";
import {
  SUBMIT_SESSION_COOKIE,
  mintSubmitSessionValue,
  submitSessionCookieOptions,
  verifySubmitSessionValue,
} from "@/lib/hubs/submit-session";

/**
 * Padme unlock + API gate.
 * Unlock: `/padme?secret=<REVIEW_SECRET>` sets cookie and redirects to `/padme`.
 * Page routes without a cookie pass through so the App Router can `notFound()`.
 * `/api/padme/*` without a cookie → 404.
 *
 * Also mints the anon submit-session cookie on `/hubs/submit`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/hubs/submit" || pathname.startsWith("/hubs/submit/")) {
    return mintSubmitSessionIfNeeded(request);
  }

  const isPadmeApi = pathname === "/api/padme" || pathname.startsWith("/api/padme/");
  const isPadmePage = pathname === "/padme" || pathname.startsWith("/padme/");

  if (!isPadmeApi && !isPadmePage) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(REVIEW_COOKIE_NAME)?.value;
  const unlocked = await verifyReviewCookieValue(cookie);

  if (unlocked) {
    if (
      (pathname === "/padme" || pathname === "/padme/") &&
      request.nextUrl.searchParams.has("secret")
    ) {
      return redirectPadmeWithoutSecret(request);
    }
    return NextResponse.next();
  }

  // Unlock only on the root padme path via ?secret=
  if (pathname === "/padme" || pathname === "/padme/") {
    const secret = request.nextUrl.searchParams.get("secret");
    if (matchesReviewSecret(secret)) {
      const value = await mintReviewCookieValue();
      if (!value) {
        return NextResponse.next();
      }
      const response = redirectPadmeWithoutSecret(request);
      response.cookies.set(
        REVIEW_COOKIE_NAME,
        value,
        reviewCookieOptions(process.env.NODE_ENV === "production"),
      );
      return response;
    }
  }

  // Pages: let the App Router render `notFound()`. APIs: hard 404.
  if (isPadmeApi) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

function redirectPadmeWithoutSecret(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/padme";
  url.searchParams.delete("secret");
  return NextResponse.redirect(url);
}

async function mintSubmitSessionIfNeeded(request: NextRequest) {
  const response = NextResponse.next();
  const existing = request.cookies.get(SUBMIT_SESSION_COOKIE)?.value;
  if (await verifySubmitSessionValue(existing)) {
    return response;
  }

  const value = await mintSubmitSessionValue();
  if (!value) {
    return response;
  }

  response.cookies.set(
    SUBMIT_SESSION_COOKIE,
    value,
    submitSessionCookieOptions(process.env.NODE_ENV === "production"),
  );
  return response;
}

export const config = {
  matcher: [
    "/padme",
    "/padme/:path*",
    "/api/padme",
    "/api/padme/:path*",
    "/hubs/submit",
    "/hubs/submit/:path*",
  ],
};
