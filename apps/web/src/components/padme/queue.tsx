import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import type { AdminListItem, AdminListStatus } from "@/lib/apps/admin";
import { cn } from "@/lib/utils";

const FILTERS: { key: string; label: string; href: string }[] = [
  { key: "pending", label: "Pending", href: "/padme?status=pending" },
  { key: "draft", label: "Draft", href: "/padme?status=draft" },
  { key: "published", label: "Published", href: "/padme?status=published" },
  { key: "rejected", label: "Rejected", href: "/padme?status=rejected" },
  { key: "recent", label: "Recently reviewed", href: "/padme?recent=1" },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function rowMeta(item: AdminListItem, active: AdminListStatus | "recent"): string {
  if (active === "recent" || item.status === "published" || item.status === "rejected") {
    return `Reviewed ${formatWhen(item.reviewedAt)}`;
  }
  if (item.status === "draft") {
    return `Updated ${formatWhen(item.updatedAt)}`;
  }
  return `Submitted ${formatWhen(item.submittedAt)}`;
}

export function PadmeQueue({
  items,
  active,
}: {
  items: AdminListItem[];
  active: AdminListStatus | "recent";
}) {
  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-bold text-3xl tracking-tight">Queue</h1>
        <nav className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={filter.href}
              className={cn(
                buttonVariants({
                  variant: active === filter.key ? "default" : "secondary",
                  size: "sm",
                }),
              )}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No apps in this view.</p>
      ) : (
        <ItemGroup className="mt-8 gap-0">
          {items.flatMap((item, index) => [
            <Item
              key={item.id}
              variant="default"
              render={<Link href={`/padme/${item.publicId}`} />}
            >
              <ItemContent>
                <ItemTitle>{item.name}</ItemTitle>
                <ItemDescription>
                  {item.author} · {item.categoryName} · {item.listingType}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <div className="text-right text-sm text-muted-foreground">
                  <p className="capitalize">{item.status}</p>
                  <p>{rowMeta(item, active)}</p>
                </div>
              </ItemActions>
            </Item>,
            ...(index < items.length - 1
              ? [<ItemSeparator key={`${item.id}-sep`} className="my-0" />]
              : []),
          ])}
        </ItemGroup>
      )}
    </main>
  );
}
