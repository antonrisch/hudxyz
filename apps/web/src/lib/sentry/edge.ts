import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/enabled";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && isSentryEnabled) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    sampleRate: 1.0,
    enableLogs: true,
  });
}
