import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import Simulator from "@/components/simulator";
import { SIMULATOR_TAGLINE, SIMULATOR_TITLE } from "@/lib/simulator/config";
import {
  backgroundImageHref,
  DEFAULT_BACKGROUND,
} from "@/lib/simulator/background";
import { loadSimulatorSearchParams, seedFromParams } from "@/lib/simulator/search-params";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hud.xyz";

export const metadata: Metadata = {
  title: SIMULATOR_TITLE,
  description: SIMULATOR_TAGLINE,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: SIMULATOR_TITLE,
    description: SIMULATOR_TAGLINE,
    url: "/",
    type: "website",
    siteName: "hud.xyz",
  },
  twitter: {
    card: "summary",
    title: SIMULATOR_TITLE,
    description: SIMULATOR_TAGLINE,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SIMULATOR_TITLE,
  description: SIMULATOR_TAGLINE,
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadSimulatorSearchParams(searchParams);
  const preloadBackground =
    backgroundImageHref(params.bg === "custom" ? DEFAULT_BACKGROUND : params.bg) ?? null;
  return (
    <main className="flex h-svh flex-col overflow-hidden">
      {preloadBackground ? (
        <link rel="preload" as="image" href={preloadBackground} fetchPriority="high" />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Simulator seed={seedFromParams(params)} />
    </main>
  );
}
