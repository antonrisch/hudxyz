import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/layout/json-ld";
import { DirectoryListPage } from "@/components/listings/directory-list-page";
import { breadcrumbListJsonLd, directorySocialMetadata } from "@/lib/apps/seo";
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

  return (
    <>
      <JsonLd
        data={breadcrumbListJsonLd([{ name: "Apps", path: "/apps" }, { name: collection.name }])}
      />
      <DirectoryListPage
        title={collection.name}
        description={collection.description}
        path={path}
        listings={collection.listings}
        variant={collection.smartSort === "popular" ? "numbered" : "default"}
      />
    </>
  );
}
