import { adminListStatuses, listHubsForAdmin, type AdminListStatus } from "@/lib/hubs/admin";
import { PadmeQueue } from "@/components/padme/queue";

export const dynamic = "force-dynamic";

export default async function PadmePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; recent?: string | string[] }>;
}) {
  const params = await searchParams;
  const recentRaw = params.recent;
  const recent =
    recentRaw === "1" ||
    recentRaw === "true" ||
    (Array.isArray(recentRaw) && (recentRaw[0] === "1" || recentRaw[0] === "true"));

  const statusRaw = typeof params.status === "string" ? params.status : params.status?.[0];
  const status: AdminListStatus =
    statusRaw && (adminListStatuses as readonly string[]).includes(statusRaw)
      ? (statusRaw as AdminListStatus)
      : "pending";

  const items = recent
    ? await listHubsForAdmin({ recent: true })
    : await listHubsForAdmin({ status });

  return <PadmeQueue items={items} active={recent ? "recent" : status} />;
}
