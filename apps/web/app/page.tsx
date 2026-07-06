import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import Emulator from "@/components/emulator";
import { EMULATOR_TAGLINE, EMULATOR_TITLE } from "@/lib/emulator/config";
import { loadEmulatorSearchParams, seedFromParams } from "@/lib/emulator/search-params";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hud.xyz";

export const metadata: Metadata = {
  title: EMULATOR_TITLE,
  description: EMULATOR_TAGLINE,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: EMULATOR_TITLE,
    description: EMULATOR_TAGLINE,
    url: "/",
    type: "website",
    siteName: "hud.xyz",
  },
  twitter: {
    card: "summary",
    title: EMULATOR_TITLE,
    description: EMULATOR_TAGLINE,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: EMULATOR_TITLE,
  description: EMULATOR_TAGLINE,
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
  const params = await loadEmulatorSearchParams(searchParams);
  return (
    <main className="flex h-svh flex-col overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Emulator seed={seedFromParams(params)} />
    </main>
  );
}
