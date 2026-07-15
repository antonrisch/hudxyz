import { initBotId } from "botid/client/core";
import * as Sentry from "@sentry/nextjs";

import { captureSanitizedPageview, initPostHog } from "@/lib/analytics/client";
import { isSentryEnabled } from "@/lib/sentry/enabled";
import "@/lib/sentry/client";

initBotId({
  protect: [
    { path: "/api/apps", method: "POST" },
    { path: "/api/apps/*", method: "PATCH" },
    { path: "/api/apps/*/submit", method: "POST" },
    { path: "/api/apps/metadata", method: "POST" },
    { path: "/api/apps/assets/presign", method: "POST" },
    { path: "/api/apps/assets", method: "POST" },
    { path: "/api/apps/assets/import", method: "POST" },
    { path: "/api/apps/assets/*", method: "DELETE" },
  ],
});

initPostHog();

export function onRouterTransitionStart(url: string, navigationType: string): void {
  if (isSentryEnabled) {
    Sentry.captureRouterTransitionStart(url, navigationType);
  }
  captureSanitizedPageview(url);
}
