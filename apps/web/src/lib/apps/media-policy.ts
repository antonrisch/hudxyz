/** Screenshot and preview video — gated by the `apps-media` flag on submit + listing. */
export function isAppsMediaKind(kind: string): boolean {
  return kind === "screenshot" || kind === "video";
}
