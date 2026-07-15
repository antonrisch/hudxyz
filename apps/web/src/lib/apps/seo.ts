import type { Metadata } from "next";

import { absoluteUrl, siteUrl } from "@/lib/site";

type DirectorySocialInput = {
  title: string;
  description: string;
  path: string;
  /** Explicit image URL (icon, cover). Omit when a route `opengraph-image` file owns the card. */
  imageUrl?: string | null;
  /** Force `summary_large_image` even without `imageUrl` (file-based OG). */
  largeImage?: boolean;
};

/** Shared Open Graph + Twitter fields for directory pages. */
export function directorySocialMetadata({
  title,
  description,
  path,
  imageUrl,
  largeImage = false,
}: DirectorySocialInput): Pick<Metadata, "openGraph" | "twitter"> {
  const url = absoluteUrl(path);
  const images = imageUrl ? [{ url: imageUrl, alt: title }] : undefined;
  const useLarge = Boolean(imageUrl) || largeImage;

  return {
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "hudxyz.com",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: useLarge ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images: [imageUrl!] } : {}),
    },
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description: string | null;
  path: string;
  iconUrl: string | null;
  author: string;
  categoryName: string;
  listingType: "app" | "game";
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description ?? undefined,
    url: absoluteUrl(input.path),
    image: input.iconUrl ?? undefined,
    applicationCategory: input.listingType === "game" ? "GameApplication" : "LifestyleApplication",
    operatingSystem: "Web",
    author: {
      "@type": "Organization",
      name: input.author,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
    keywords: input.categoryName,
    publisher: {
      "@type": "Organization",
      name: "hudxyz.com",
      url: siteUrl(),
    },
  };
}

export function itemListJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: Array<{ name: string; path: string }>;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: "hudxyz.com",
      url: siteUrl(),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}
