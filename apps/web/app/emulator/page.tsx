import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import Emulator from "@/components/emulator";
import { loadEmulatorSearchParams, seedFromParams } from "@/lib/emulator/search-params";

export const metadata: Metadata = {
  title: "Emulator",
  description: "hud.xyz glasses display emulator.",
};

export default async function EmulatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await loadEmulatorSearchParams(searchParams);
  return (
    <main className="flex flex-1 flex-col bg-white">
      <Emulator seed={seedFromParams(params)} />
    </main>
  );
}
