import type { SearchParams } from "nuqs/server";
import { permanentRedirect } from "next/navigation";

/** `/` → `/simulator` (legacy share links keep query params). */
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
  permanentRedirect(query ? `/simulator?${query}` : "/simulator");
}
