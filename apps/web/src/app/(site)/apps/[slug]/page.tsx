import { notFound, permanentRedirect } from "next/navigation";

import { listingPath } from "@/lib/apps/public-id";
import { getPublishedListingBySlug } from "@/lib/apps/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Legacy `/apps/{slug}` → canonical `/apps/{slug}/{publicId}` when unique. */
export default async function LegacyAppSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) notFound();
  permanentRedirect(listingPath(listing.slug, listing.publicId));
}
