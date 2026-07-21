import type { Metadata } from "next";
import Link from "next/link";

import { DirectoryList } from "@/components/directory/directory-list";
import { listPublishedHubs } from "@/lib/hubs/queries";

export const dynamic = "force-dynamic";

const COPY = {
  title: "Hub Directory",
  description: "Discover community hubs shipping Meta Ray-Ban Display web apps.",
} as const;

export const metadata: Metadata = {
  title: COPY.title,
  description: COPY.description,
  alternates: { canonical: "/hubs" },
};

export default async function HubsDirectoryPage() {
  const hubs = await listPublishedHubs();

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10">
      <h1 className="font-bold text-3xl tracking-tight">{COPY.title}</h1>
      <p className="mt-2 text-base text-muted-foreground">{COPY.description}</p>

      <div className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Hubs are maintained by third-party developers. Always review what you open in the simulator.
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Don&apos;t see your hub?{" "}
        <Link
          href="/hubs/submit"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Submit one here
        </Link>
        .
      </p>

      <DirectoryList hubs={hubs} />
    </main>
  );
}
