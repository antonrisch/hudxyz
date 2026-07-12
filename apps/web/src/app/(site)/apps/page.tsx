import type { Metadata } from "next";
import Link from "next/link";

import { ListingRow } from "@/components/listings/listing-row";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import { type ListingType, listingTypes } from "@/db/schema";
import { listPublishedListings } from "@/lib/apps/queries";

type ActiveFilter = "all" | ListingType;

const PAGE_COPY: Record<ActiveFilter, { title: string; description: string }> = {
  all: {
    title: "Apps & Games",
    description: "Wearable web apps and games for smart glasses.",
  },
  app: {
    title: "Apps",
    description: "Wearable web apps for smart glasses.",
  },
  game: {
    title: "Games",
    description: "Wearable games for smart glasses.",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const listingType = parseListingType(params.type);
  const active: ActiveFilter = listingType ?? "all";
  const { title, description } = PAGE_COPY[active];

  return {
    title,
    description: `${description} Open them in the hud.xyz simulator.`,
    alternates: { canonical: listingType ? `/apps?type=${listingType}` : "/apps" },
  };
}

function parseListingType(value: string | string[] | undefined): ListingType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return (listingTypes as readonly string[]).includes(raw) ? (raw as ListingType) : undefined;
}

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const params = await searchParams;
  const listingType = parseListingType(params.type);
  const active: ActiveFilter = listingType ?? "all";
  const { title, description } = PAGE_COPY[active];
  const listings = await listPublishedListings(listingType ? { listingType } : undefined);

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        {description}{" "}
        <Link href="/simulator" className="underline underline-offset-4 hover:text-foreground">
          Open the simulator
        </Link>
      </p>

      {listings.length === 0 ? (
        <ListingsEmpty />
      ) : (
        <ul className="mt-8 grid list-none grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingRow key={listing.slug} listing={listing} />
          ))}
        </ul>
      )}
    </main>
  );
}
