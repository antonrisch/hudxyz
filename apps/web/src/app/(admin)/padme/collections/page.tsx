import { CollectionsList } from "@/components/padme/collections-list";
import { listCollectionsForAdmin } from "@/lib/collections/admin";

export const dynamic = "force-dynamic";

export default async function PadmeCollectionsPage() {
  const items = await listCollectionsForAdmin();
  return <CollectionsList initial={items} />;
}
