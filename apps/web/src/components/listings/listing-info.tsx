import { SquareArrowOutUpRight } from "lucide-react";

import { ListingSection } from "@/components/listings/listing-section";
import { authorHref, formatInstallCount } from "@/lib/apps/listing-urls";
import type { ListingDetail } from "@/lib/apps/queries";

const DEVICE_LABELS: Record<string, string> = {
  mrbd: "Meta Ray-Ban Display",
};

function ExternalLinkIcon({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex text-foreground hover:text-muted-foreground"
    >
      <SquareArrowOutUpRight className="size-4" aria-hidden />
    </a>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start sm:gap-4 sm:py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ListingInformation({ listing }: { listing: ListingDetail }) {
  const developerHref = authorHref(listing.author);
  const categoryLabel = [listing.categoryName, listing.secondaryCategoryName]
    .filter(Boolean)
    .join(" · ");
  const compatibility =
    listing.targetDevice === "mrbd"
      ? "Works on Meta Ray-Ban Display"
      : (DEVICE_LABELS[listing.targetDevice] ?? listing.targetDevice.toUpperCase());

  return (
    <ListingSection title="Information">
      <div>
        <dl>
          {listing.author.trim() ? (
            <InfoRow label="Developer website">
              {developerHref ? (
                <ExternalLinkIcon href={developerHref} label="Open developer website" />
              ) : (
                listing.author
              )}
            </InfoRow>
          ) : null}

          {categoryLabel ? <InfoRow label="Category">{categoryLabel}</InfoRow> : null}

          <InfoRow label="Compatibility">{compatibility}</InfoRow>

          <InfoRow label="Installs">{formatInstallCount(listing.launchCount)}</InfoRow>

          <InfoRow label="App URL">
            <ExternalLinkIcon href={listing.launchUrl} label="Open app URL" />
          </InfoRow>
        </dl>
      </div>
    </ListingSection>
  );
}
