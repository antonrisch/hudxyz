import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/enabled";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && isSentryEnabled) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    sampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    integrations: [Sentry.replayIntegration()],
  });
}
