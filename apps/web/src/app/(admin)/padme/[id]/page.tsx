import { notFound } from "next/navigation";

import { PadmeDetail } from "@/components/padme/detail";
import { getHubForAdmin, serializeAdminDetail } from "@/lib/hubs/admin";

export const dynamic = "force-dynamic";

export default async function PadmeHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getHubForAdmin(id);
  if (!detail) notFound();

  return <PadmeDetail initial={serializeAdminDetail(detail)} />;
}
