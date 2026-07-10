import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/enabled";
import "@/lib/sentry/client";

export const onRouterTransitionStart = isSentryEnabled
  ? Sentry.captureRouterTransitionStart
  : () => {};
