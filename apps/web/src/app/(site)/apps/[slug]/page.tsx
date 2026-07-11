import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingIcon } from "@/components/listings/listing-icon";
import { ListingMedia } from "@/components/listings/listing-media";
import { ListingMeta } from "@/components/listings/listing-meta";
import { OpenInSimulator } from "@/components/listings/open-in-simulator";
import { buttonVariants } from "@/components/ui/button";
import { getPublishedListingBySlug } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) {
    return { title: "App not found" };
  }

  return {
    title: listing.name,
    description: listing.description ?? listing.subtitle ?? `${listing.name} on hud.xyz`,
    alternates: { canonical: `/apps/${listing.slug}` },
  };
}

export default async function AppDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) notFound();

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center">
          <ListingIcon src={listing.iconUrl} alt={listing.name + " icon"} size={80} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-24 min-w-0 flex-col justify-center gap-1">
            <h1 className="text-3xl font-bold tracking-tight">{listing.name}</h1>
            {listing.subtitle ? (
              <p className="text-base font-medium text-muted-foreground">{listing.subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <OpenInSimulator launchUrl={listing.launchUrl} />
            <a
              href={listing.launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Open launch URL
            </a>
          </div>
        </div>
      </div>

      <ListingMeta listing={listing} />

      <ListingMedia screenshots={listing.screenshots} video={listing.video} />

      {listing.description ? (
        <p className="mt-4 text-base/relaxed whitespace-pre-wrap">{listing.description}</p>
      ) : null}
    </main>
  );
}
