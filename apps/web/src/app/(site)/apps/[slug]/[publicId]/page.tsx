import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ImageGradientBackground } from "@/components/listings/image-gradient-background";
import { ListingHeader } from "@/components/listings/listing-header";
import { ListingInformation } from "@/components/listings/listing-info";
import { ListingMedia } from "@/components/listings/listing-media";
import { ListingOverview } from "@/components/listings/listing-overview";
import { listingPath } from "@/lib/apps/public-id";
import { getPublishedListingByPublicId } from "@/lib/apps/queries";

type PageProps = {
  params: Promise<{ slug: string; publicId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const listing = await getPublishedListingByPublicId(publicId);
  if (!listing) {
    return { title: "App not found" };
  }

  return {
    title: listing.name,
    description: listing.description ?? undefined,
    alternates: { canonical: listingPath(listing.slug, listing.publicId) },
  };
}

export default async function AppDetailPage({ params }: PageProps) {
  const { slug, publicId } = await params;
  const listing = await getPublishedListingByPublicId(publicId);
  if (!listing) notFound();

  // Slug is cosmetic — keep the canonical path in sync when the name changes.
  if (slug !== listing.slug) {
    permanentRedirect(listingPath(listing.slug, listing.publicId));
  }

  return (
    <main
      className={
        listing.iconUrl
          ? "page-px mx-auto w-full max-w-6xl flex-1 space-y-8 pt-2 sm:pt-0 pb-10"
          : "page-px mx-auto w-full max-w-6xl flex-1 space-y-8 py-10"
      }
    >
      <div className="space-y-4">
        {listing.iconUrl ? (
          <ImageGradientBackground
            src={listing.iconUrl}
            className="h-[clamp(8rem,10svh,10rem)] rounded-xl sm:h-[clamp(8rem,16svh,12rem)]"
          />
        ) : null}
        <ListingHeader listing={listing} />
      </div>
      <ListingMedia screenshots={listing.screenshots} video={listing.video} />
      <ListingOverview description={listing.description} />
      <ListingInformation listing={listing} />
    </main>
  );
}
