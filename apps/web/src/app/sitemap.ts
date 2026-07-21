import type { MetadataRoute } from "next";

import { legal } from "@/lib/legal/config";
import { siteUrl } from "@/lib/site";

function entry(url: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return lastModified ? { url, lastModified } : { url };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  return [
    entry(`${base}/simulator`),
    entry(`${base}/hubs`),
    entry(`${base}/privacy`, new Date(legal.privacyLastUpdated)),
    entry(`${base}/terms`, new Date(legal.termsLastUpdated)),
  ];
}
