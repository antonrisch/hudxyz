import type { MetadataRoute } from "next";
import { legal } from "@/lib/legal/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hud.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/simulator`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/apps`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(legal.lastUpdated),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(legal.lastUpdated),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
