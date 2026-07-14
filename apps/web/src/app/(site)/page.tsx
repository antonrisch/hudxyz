import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { permanentRedirect } from "next/navigation";

import { ChevronTitle } from "@/components/layout/chevron-title";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import { ListingsGrid } from "@/components/listings/listings-grid";
import { listPublishedListings } from "@/lib/apps/queries";

export const metadata: Metadata = {
  title: "hudxyz.com",
  description:
    "Discover wearable web apps and games for Meta Ray-Ban Display. Add them to your glasses or preview in the hudxyz.com simulator.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
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

  const listings = await listPublishedListings();

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      <ChevronTitle href="/apps">Apps and Games</ChevronTitle>
      <p className="mt-2 text-base text-muted-foreground">
        Discover the best web apps and games for Meta Ray-Ban Display made by the community.
      </p>

      {listings.length === 0 ? (
        <ListingsEmpty />
      ) : (
        <ListingsGrid listings={listings} className="mt-8" />
      )}
    </main>
  );
}
