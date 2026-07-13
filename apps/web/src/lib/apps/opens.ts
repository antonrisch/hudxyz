import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { apps } from "@/db/schema";
import { isPublicId } from "@/lib/apps/public-id";
import type { OpenKind } from "@/lib/apps/track-open";

/** Atomically bump launch_count or sim_count for a published listing. */
export async function incrementPublishedOpen(publicId: string, kind: OpenKind): Promise<boolean> {
  if (!isPublicId(publicId)) return false;

  const db = getDb();
  const where = and(eq(apps.publicId, publicId), eq(apps.status, "published"));

  switch (kind) {
    case "launch": {
      const rows = await db
        .update(apps)
        .set({ launchCount: sql`${apps.launchCount} + 1` })
        .where(where)
        .returning({ id: apps.id });
      return rows.length > 0;
    }
    case "sim": {
      const rows = await db
        .update(apps)
        .set({ simCount: sql`${apps.simCount} + 1` })
        .where(where)
        .returning({ id: apps.id });
      return rows.length > 0;
    }
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return false;
    }
  }
}
