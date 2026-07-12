import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "hud.xyz",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

/** Legacy `/?url=…` (and other query) share links → `/simulator`. */
export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry);
    } else {
      qs.set(key, value);
    }
  }

  const query = qs.toString();
  if (query) permanentRedirect(`/simulator?${query}`);

  return <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10" />;
}
