import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import Emulator from "@/components/emulator";
import { loadEmulatorSearchParams, seedFromParams } from "@/lib/emulator/search-params";

export const metadata: Metadata = {
  title: "Meta Ray-Ban Display Emulator",
  description:
    "Preview Meta Ray-Ban Display web apps in a 600x600 emulator with D-pad controls. No glasses required.",
};

export default async function EmulatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadEmulatorSearchParams(searchParams);
  return (
    <main className="flex flex-1 flex-col">
      <Emulator seed={seedFromParams(params)} />
    </main>
  );
}
