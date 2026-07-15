import { notFound } from "next/navigation";

import { PadmeDetail } from "@/components/padme/detail";
import { appsMedia } from "@/flags";
import { getAppForAdmin, serializeAdminDetail } from "@/lib/apps/admin";
import { listCategoriesForForm } from "@/lib/apps/draft";

export const dynamic = "force-dynamic";

export default async function PadmeAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, categories, appsMediaEnabled] = await Promise.all([
    getAppForAdmin(id),
    listCategoriesForForm(),
    appsMedia(),
  ]);
  if (!detail) notFound();

  return (
    <PadmeDetail
      initial={serializeAdminDetail(detail)}
      categories={categories.map((category) => ({
        id: category.id,
        listingType: category.listingType,
        slug: category.slug,
        name: category.name,
      }))}
      appsMediaEnabled={appsMediaEnabled}
    />
  );
}
