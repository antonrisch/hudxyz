import { notFound } from "next/navigation";

import { CollectionEditor } from "@/components/padme/collection-editor";
import { getCollectionForAdmin } from "@/lib/collections/admin";
import { categoryCatalog } from "@/lib/category/categories";

export const dynamic = "force-dynamic";

export default async function PadmeCollectionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCollectionForAdmin(id);
  if (!detail) notFound();

  return <CollectionEditor initial={detail} categories={categoryCatalog} />;
}
