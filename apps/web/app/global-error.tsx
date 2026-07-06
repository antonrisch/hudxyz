"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { isSentryEnabled } from "@/lib/sentry-enabled";
import { useMountEffect } from "@/lib/use-mount-effect";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useMountEffect(() => {
    if (isSentryEnabled) Sentry.captureException(error);
  });

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
