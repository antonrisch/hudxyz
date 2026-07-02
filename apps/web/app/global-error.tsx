"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useMountEffect } from "@/lib/use-mount-effect";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useMountEffect(() => {
    Sentry.captureException(error);
  });

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
