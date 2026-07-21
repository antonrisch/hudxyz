import type { Metadata } from "next";
import Link from "next/link";

import { DirectoryList } from "@/components/directory/directory-list";
import { Item, ItemContent, ItemDescription } from "@/components/ui/item";
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

      <Item variant="muted" className="mt-6">
        <ItemContent>
          <ItemDescription className="line-clamp-none">
            Hubs are maintained by third-party developers. Always review what you open in the
            simulator.
          </ItemDescription>
        </ItemContent>
      </Item>

      <p className="mt-4 text-sm text-muted-foreground">
        Don&apos;t see your hub?{" "}
        <Link
          href="/hubs/submit"
          className="font-medium text-foreground underline underline-offset-1 decoration-muted-foreground hover:decoration-foreground"
        >
          Submit one here
        </Link>
        .
      </p>

      <DirectoryList hubs={hubs} />
    </main>
  );
}
