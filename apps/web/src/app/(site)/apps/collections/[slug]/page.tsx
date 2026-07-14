import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingsEmpty } from "@/components/listings/listings-empty";
import { ListingsGrid } from "@/components/listings/listings-grid";
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

  return {
    title: collection.name,
    description:
      collection.description ??
      `Browse ${collection.name} on the Meta Ray-Ban Display apps directory.`,
    alternates: { canonical: `/apps/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug);
  if (!collection) notFound();

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
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
