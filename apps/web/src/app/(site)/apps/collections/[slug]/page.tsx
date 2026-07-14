import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/layout/json-ld";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import { ListingsGrid } from "@/components/listings/listings-grid";
import { listingPath } from "@/lib/apps/public-id";
import { directorySocialMetadata, itemListJsonLd } from "@/lib/apps/seo";
import { getPublishedCollectionBySlug } from "@/lib/collections/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug);
  if (!collection) {
    return { title: "Collection" };
  }

  const path = `/apps/collections/${collection.slug}`;
  const description =
    collection.description ??
    `Browse ${collection.name} on the Meta Ray-Ban Display apps directory.`;

  return {
    title: collection.name,
    description,
    alternates: { canonical: path },
    ...directorySocialMetadata({
      title: collection.name,
      description,
      path,
      imageUrl: collection.coverUrl,
    }),
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug);
  if (!collection) notFound();

  const path = `/apps/collections/${collection.slug}`;
  const description =
    collection.description ??
    `Browse ${collection.name} on the Meta Ray-Ban Display apps directory.`;

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      <JsonLd
        data={itemListJsonLd({
          name: collection.name,
          description,
          path,
          items: collection.listings.map((listing) => ({
            name: listing.name,
            path: listingPath(listing.slug, listing.publicId),
          })),
        })}
      />
      <h1 className="font-bold text-3xl tracking-tight">{collection.name}</h1>
      {collection.description ? (
        <p className="mt-2 text-base text-muted-foreground">{collection.description}</p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {collection.listings.length === 1
          ? "1 result"
          : `${collection.listings.length.toLocaleString()} results`}
      </p>

      {collection.listings.length === 0 ? (
        <div className="mt-8">
          <ListingsEmpty />
        </div>
      ) : (
        <ListingsGrid listings={collection.listings} className="mt-8" />
      )}
    </main>
  );
}
