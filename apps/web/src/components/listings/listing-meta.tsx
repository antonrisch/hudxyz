import { Glasses, SquareUserRound } from "lucide-react";

import type { ListingDetail } from "@/lib/apps/queries";
import { getCategoryIcon } from "@/lib/category/category-icons";
import { cn } from "@/lib/utils";

const DEVICE_LABELS: Record<string, { short: string; detail: string }> = {
  mrbd: { short: "MRBD", detail: "Meta Ray-Ban Display" },
};

function formatOpens(count: number): string {
  return count.toLocaleString();
}

function MetaColumn({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string | null;
  className?: string;
}) {
  const isText = typeof value === "string";

  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 px-2 text-center", className)}
    >
      <p className="text-xs font-semibold leading-none uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "grid h-9 w-full place-items-center text-xl font-semibold leading-none tabular-nums",
          isText && "pt-2",
        )}
      >
        {value}
      </div>
      {detail ? (
        <p className="max-w-full truncate text-sm leading-none">{detail}</p>
      ) : (
        <span className="min-h-4" aria-hidden />
      )}
    </div>
  );
}

export function ListingMeta({
  listing,
  className,
}: {
  listing: ListingDetail;
  className?: string;
}) {
  const CategoryIcon = getCategoryIcon(listing.listingType, listing.categorySlug);
  const categoryDetail = [listing.categoryName, listing.secondaryCategoryName]
    .filter(Boolean)
    .join(" · ");
  const device = DEVICE_LABELS[listing.targetDevice] ?? {
    short: listing.targetDevice.toUpperCase(),
    detail: null,
  };
  const typeLabel = listing.listingType === "game" ? "Game" : "App";

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-y-4 border-t border-border py-4 sm:grid-cols-5",
        className,
      )}
    >
      <MetaColumn label="Opens" value={formatOpens(listing.launchCount)} />
      <MetaColumn label="Type" value={typeLabel} />
      <MetaColumn
        label="Developer"
        value={<SquareUserRound className="size-7 stroke-[1.75]" aria-hidden />}
        detail={listing.author}
      />
      <MetaColumn
        label="Category"
        value={<CategoryIcon className="size-7 stroke-[1.75]" aria-hidden />}
        detail={categoryDetail}
      />
      <MetaColumn
        label="Device"
        value={
          listing.targetDevice === "mrbd" ? (
            <Glasses className="size-7 stroke-[1.75]" aria-hidden />
          ) : (
            device.short
          )
        }
        detail={device.detail}
      />
    </div>
  );
}
