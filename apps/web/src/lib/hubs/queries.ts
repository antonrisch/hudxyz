import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { hubs } from "@/db/schema";
import { publicUrl } from "@/lib/r2";

export type HubListItem = {
  id: string;
  publicId: string;
  slug: string;
  name: string;
  description: string | null;
  homepage: string;
  launchUrl: string;
  logoUrl: string | null;
};

export async function listPublishedHubs(): Promise<HubListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: hubs.id,
      publicId: hubs.publicId,
      slug: hubs.slug,
      name: hubs.name,
      description: hubs.description,
      homepage: hubs.homepage,
      launchUrl: hubs.launchUrl,
      logoObjectKey: hubs.logoObjectKey,
    })
    .from(hubs)
    .where(eq(hubs.status, "published"))
    .orderBy(desc(hubs.publishedAt), desc(hubs.createdAt));

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    homepage: row.homepage,
    launchUrl: row.launchUrl,
    logoUrl: row.logoObjectKey ? publicUrl(row.logoObjectKey) : null,
  }));
}
