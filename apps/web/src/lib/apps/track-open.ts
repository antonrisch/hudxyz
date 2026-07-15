import { track } from "@/lib/analytics/track";
import { markNextSimulatorLoadAsCatalog } from "@/lib/analytics/simulator-source";

export const openKinds = ["launch", "sim"] as const;

export type OpenKind = (typeof openKinds)[number];

/** Fire-and-forget open counter for published listings (+ PostHog listing_opened). */
export function trackListingOpen(publicId: string, kind: OpenKind): void {
  track("listing_opened", { public_id: publicId, kind });
  if (kind === "sim") markNextSimulatorLoadAsCatalog();

  const url = `/api/apps/${encodeURIComponent(publicId)}/opens?kind=${kind}`;

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(url)) return;
  }

  void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}
