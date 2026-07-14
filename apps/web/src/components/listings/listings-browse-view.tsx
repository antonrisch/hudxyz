import { ListingsEmpty } from "@/components/listings/listings-empty";
import { ListingsGrid } from "@/components/listings/listings-grid";
import {
  ListingsResultsHeader,
  type ResultsHeaderState,
} from "@/components/listings/listings-results-header";
import type { ListingListItem } from "@/lib/apps/queries";

export function ListingsBrowseView({
  header,
  listings,
}: {
  header: ResultsHeaderState;
  listings: readonly ListingListItem[];
}) {
  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      <ListingsResultsHeader state={header} />

      {listings.length === 0 ? (
        <div className="mt-8">
          <ListingsEmpty />
        </div>
      ) : (
        <ListingsGrid listings={listings} className="mt-8" />
      )}
    </main>
  );
}
