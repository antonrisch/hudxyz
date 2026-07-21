import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function AppsNotFound() {
  return (
    <main className="page-px mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 py-16">
      <h1 className="font-bold text-3xl tracking-tight">Not found</h1>
      <p className="max-w-md text-muted-foreground">
        That app, category, or collection isn’t in the directory — or it isn’t published yet.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/hubs" className={buttonVariants({ variant: "default" })}>
          Browse apps
        </Link>
        <Link href="/hubs/submit" className={buttonVariants({ variant: "outline" })}>
          Submit an app
        </Link>
      </div>
    </main>
  );
}
