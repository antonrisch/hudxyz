import { initBotId } from "botid/client/core";
import * as Sentry from "@sentry/nextjs";

import { captureSanitizedPageview, initPostHog } from "@/lib/analytics/client";
import { isSentryEnabled } from "@/lib/sentry/enabled";
import "@/lib/sentry/client";

initBotId({
  protect: [
    { path: "/api/hubs", method: "POST" },
    { path: "/api/hubs/*", method: "PATCH" },
    { path: "/api/hubs/*/submit", method: "POST" },
    { path: "/api/hubs/logo/presign", method: "POST" },
    { path: "/api/hubs/logo", method: "POST" },
    { path: "/api/hubs/logo", method: "DELETE" },
  ],
});

initPostHog();

export function onRouterTransitionStart(url: string, navigationType: string): void {
  if (isSentryEnabled) {
    Sentry.captureRouterTransitionStart(url, navigationType);
  }
  captureSanitizedPageview(url);
}
