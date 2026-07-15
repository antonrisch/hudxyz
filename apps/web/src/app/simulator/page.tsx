import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { cookies } from "next/headers";
import Simulator from "@/components/simulator";
import { listPublishedListings } from "@/lib/apps/queries";
import { legal } from "@/lib/legal/config";
import { SIMULATOR_TAGLINE, SIMULATOR_TITLE, type SuggestedApp } from "@/lib/simulator/config";
import { backgroundPreloadHref, DEFAULT_BACKGROUND } from "@/lib/simulator/background";
import { loadSimulatorSearchParams, seedFromParams } from "@/lib/simulator/search-params";
import {
  DISPLAY_PANEL_OPEN_COOKIE,
  TOOLBAR_PLACEMENT_COOKIE,
  parseDisplayPanelOpenCookie,
  parseToolbarPlacementCookie,
} from "@/lib/simulator/store";

async function loadSuggestedApps(): Promise<SuggestedApp[]> {
  try {
    const listings = await listPublishedListings({ sort: "popular", limit: 5 });
    return listings.map((listing) => ({
      name: listing.name,
      url: listing.launchUrl,
      iconUrl: listing.iconUrl ?? "",
    }));
  } catch (error) {
    // Simulator should still load if Turso is unreachable.
    console.error("Simulator suggested apps unavailable", error);
    return [];
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hudxyz.com";

export const metadata: Metadata = {
  title: SIMULATOR_TITLE,
  description: SIMULATOR_TAGLINE,
  alternates: { canonical: "/simulator" },
  robots: { index: true, follow: true },
  openGraph: {
    title: SIMULATOR_TITLE,
    description: SIMULATOR_TAGLINE,
    url: "/simulator",
    type: "website",
    siteName: "hudxyz.com",
  },
  twitter: {
    card: "summary_large_image",
    title: SIMULATOR_TITLE,
    description: SIMULATOR_TAGLINE,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SIMULATOR_TITLE,
  description: SIMULATOR_TAGLINE,
  url: `${siteUrl}/simulator`,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  publisher: {
    "@type": "Organization",
    name: legal.entityName,
    url: siteUrl,
  },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadSimulatorSearchParams(searchParams);
  const cookieStore = await cookies();
  const suggestedApps = await loadSuggestedApps();
  const preloadBackground =
    backgroundPreloadHref(params.bg === "custom" ? DEFAULT_BACKGROUND : params.bg) ?? null;
  return (
    <main className="flex h-svh flex-col overflow-hidden">
      {preloadBackground ? (
        <link
          rel="preload"
          as="image"
          href={preloadBackground}
          type="image/webp"
          fetchPriority="high"
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Simulator
        seed={{
          ...seedFromParams(params),
          displayPanelOpen: parseDisplayPanelOpenCookie(
            cookieStore.get(DISPLAY_PANEL_OPEN_COOKIE)?.value,
          ),
          toolbarPlacement: parseToolbarPlacementCookie(
            cookieStore.get(TOOLBAR_PLACEMENT_COOKIE)?.value,
          ),
        }}
        suggestedApps={suggestedApps}
      />
    </main>
  );
}
