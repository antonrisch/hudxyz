import { notFound } from "next/navigation";

import { PadmeDetail } from "@/components/padme/detail";
import { getAppForAdmin, serializeAdminDetail } from "@/lib/apps/admin";
import { listCategoriesForForm } from "@/lib/apps/draft";

export const dynamic = "force-dynamic";

export default async function PadmeAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAppForAdmin(id);
  if (!detail) notFound();

  const categories = await listCategoriesForForm();

  return (
    <PadmeDetail
      initial={serializeAdminDetail(detail)}
      categories={categories.map((category) => ({
        id: category.id,
        listingType: category.listingType,
        slug: category.slug,
        name: category.name,
      }))}
    />
  );
}
