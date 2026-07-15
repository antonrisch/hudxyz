import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { permanentRedirect } from "next/navigation";

import { AppFooter } from "@/components/layout/app-footer";
import { ChevronTitle } from "@/components/layout/chevron-title";
import { JsonLd } from "@/components/layout/json-ld";
import { SimulatorHero } from "@/components/home/simulator-hero";
import { ListingShelf } from "@/components/listings/listing-shelf";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import { listingPath } from "@/lib/apps/public-id";
import { directorySocialMetadata, itemListJsonLd } from "@/lib/apps/seo";
import { listPublishedShelves } from "@/lib/collections/queries";

const HUB_COPY = {
  title: "Apps and Games",
  description:
    "Discover the best web apps and games for Meta Ray-Ban Display made by the community.",
} as const;

const PAGE_TITLE = "Meta Ray-Ban Display Simulator & App Directory";
const PAGE_DESCRIPTION =
  "The Meta Ray-Ban Display Simulator and community app directory. Preview MRBD web apps and games in your browser at 600×600 with D-pad input — no glasses required.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  ...directorySocialMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: "/",
  }),
};

/** Legacy `/?url=…` (and other query) share links → `/simulator`. */
export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry);
    } else {
      qs.set(key, value);
    }
  }

  const query = qs.toString();
  if (query) permanentRedirect(`/simulator?${query}`);

  const shelves = await listPublishedShelves();
  const jsonItems = shelves.flatMap((shelf) =>
    shelf.listings.slice(0, 6).map((listing) => ({
      name: listing.name,
      path: listingPath(listing.slug, listing.publicId),
    })),
  );

  return (
    <>
      <main className="page-px mx-auto w-full max-w-6xl flex-1 pt-2 pb-10">
        <JsonLd
          data={itemListJsonLd({
            name: HUB_COPY.title,
            description: HUB_COPY.description,
            path: "/",
            items: jsonItems,
          })}
        />
        <SimulatorHero />

        <div className="mt-12">
          <ChevronTitle href="/apps">{HUB_COPY.title}</ChevronTitle>
          <p className="mt-2 text-base text-muted-foreground">{HUB_COPY.description}</p>

          {shelves.length === 0 ? (
            <div className="mt-8">
              <ListingsEmpty />
            </div>
          ) : (
            <div className="mt-10 space-y-10">
              {shelves.map((shelf) => (
                <ListingShelf key={shelf.slug} shelf={shelf} />
              ))}
            </div>
          )}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
