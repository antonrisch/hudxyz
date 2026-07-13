import { initBotId } from "botid/client/core";
import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry/enabled";
import "@/lib/sentry/client";

initBotId({
  protect: [
    { path: "/api/apps", method: "POST" },
    { path: "/api/apps/*", method: "PATCH" },
    { path: "/api/apps/*/submit", method: "POST" },
    { path: "/api/apps/assets/presign", method: "POST" },
    { path: "/api/apps/assets", method: "POST" },
    { path: "/api/apps/assets/*", method: "DELETE" },
  ],
});

export const onRouterTransitionStart = isSentryEnabled
  ? Sentry.captureRouterTransitionStart
  : () => {};
