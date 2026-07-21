"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { useMountEffect } from "@/lib/use-mount-effect";

export default function AppsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useMountEffect(() => {
    console.error("Apps directory error", error);
  });

  return (
    <main className="page-px mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 py-16">
      <h1 className="font-bold text-3xl tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        The apps directory hit an unexpected error. You can try again or head back to the hub.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link href="/hubs" className={buttonVariants({ variant: "outline" })}>
          Back to apps
        </Link>
      </div>
    </main>
  );
}
