import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/enabled";

export async function register() {
  if (!isSentryEnabled) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sentry/server");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("@/lib/sentry/edge");
  }
}

export const onRequestError = isSentryEnabled ? Sentry.captureRequestError : () => {};
