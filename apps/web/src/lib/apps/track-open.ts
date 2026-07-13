export const openKinds = ["launch", "sim"] as const;

export type OpenKind = (typeof openKinds)[number];

/** Fire-and-forget open counter for published listings. */
export function trackListingOpen(publicId: string, kind: OpenKind): void {
  const url = `/api/apps/${encodeURIComponent(publicId)}/opens?kind=${kind}`;

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(url)) return;
  }

  void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}
