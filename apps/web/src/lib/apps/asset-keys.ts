import type { AppAssetKind } from "@/db/schema";

import { sanitizeAssetFilename } from "./asset-limits";

function prefixForKind(appId: string, kind: AppAssetKind): string {
  switch (kind) {
    case "icon":
      return `apps/${appId}/icon/`;
    case "screenshot":
      return `apps/${appId}/screenshots/`;
    case "video":
      return `apps/${appId}/videos/`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Kind prefixes must not overlap so assertObjectKeyForApp stays strict. */
export function appAssetObjectKey(appId: string, kind: AppAssetKind, filename: string): string {
  const safeName = sanitizeAssetFilename(filename);
  if (!safeName) {
    throw new Error("Invalid asset filename");
  }

  return `${prefixForKind(appId, kind)}${safeName}`;
}

export function assertObjectKeyForApp(
  appId: string,
  objectKey: string,
  kind: AppAssetKind,
): boolean {
  if (objectKey.includes("..")) return false;
  const prefix = prefixForKind(appId, kind);
  if (!objectKey.startsWith(prefix)) return false;
  const rest = objectKey.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}
