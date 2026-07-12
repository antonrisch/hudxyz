import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingHeader } from "@/components/listings/listing-header";
import { ListingInformation } from "@/components/listings/listing-info";
import { ListingMedia } from "@/components/listings/listing-media";
import { ListingOverview } from "@/components/listings/listing-overview";
import { getPublishedListingBySlug } from "@/lib/apps/queries";

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
    description: listing.description,
    alternates: { canonical: `/apps/${listing.slug}` },
  };
}

export default async function AppDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) notFound();

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 space-y-8 py-10">
      <ListingHeader listing={listing} />
      <ListingMedia screenshots={listing.screenshots} video={listing.video} />
      <ListingOverview description={listing.description} />
      <ListingInformation listing={listing} />
    </main>
  );
}
