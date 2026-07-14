import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { JsonLd } from "@/components/layout/json-ld";
import { ImageGradientBackground } from "@/components/listings/image-gradient-background";
import { ListingBreadcrumbs } from "@/components/listings/listing-breadcrumbs";
import { ListingHeader } from "@/components/listings/listing-header";
import { ListingInformation } from "@/components/listings/listing-info";
import { ListingMedia } from "@/components/listings/listing-media";
import { ListingOverview } from "@/components/listings/listing-overview";
import { listingPath } from "@/lib/apps/public-id";
import { getPublishedListingByPublicId } from "@/lib/apps/queries";
import { directorySocialMetadata, softwareApplicationJsonLd } from "@/lib/apps/seo";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string; publicId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const listing = await getPublishedListingByPublicId(publicId);
  if (!listing) {
    return { title: "App not found" };
  }

  const path = listingPath(listing.slug, listing.publicId);
  const description =
    listing.description ??
    `${listing.name} for Meta Ray-Ban Display — open in the hudxyz.com simulator.`;

  // OG/Twitter images come from opengraph-image.tsx / twitter-image.tsx
  // (generated card). Do not pass imageUrl here — it would override the file.
  return {
    title: listing.name,
    description,
    alternates: { canonical: path },
    ...directorySocialMetadata({
      title: listing.name,
      description,
      path,
      largeImage: true,
    }),
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

  const path = listingPath(listing.slug, listing.publicId);

  return (
    <main
      className={cn(
        "page-px mx-auto w-full max-w-6xl flex-1 space-y-8 pb-10",
        listing.iconUrl ? "pt-2" : "pt-10",
      )}
    >
      <JsonLd
        data={softwareApplicationJsonLd({
          name: listing.name,
          description: listing.description,
          path,
          iconUrl: listing.iconUrl,
          author: listing.author,
          categoryName: listing.categoryName,
          listingType: listing.listingType,
        })}
      />
      <div className="space-y-4">
        {listing.iconUrl ? (
          <ImageGradientBackground
            src={listing.iconUrl}
            className="h-[clamp(8rem,10svh,10rem)] rounded-2xl sm:h-[clamp(8rem,16svh,12rem)]"
          >
            <ListingBreadcrumbs listing={listing} className="absolute top-3 left-3 z-10" />
          </ImageGradientBackground>
        ) : (
          <ListingBreadcrumbs listing={listing} />
        )}
        <ListingHeader listing={listing} />
      </div>
      <ListingMedia screenshots={listing.screenshots} video={listing.video} />
      <ListingOverview description={listing.description} />
      <ListingInformation listing={listing} />
    </main>
  );
}
