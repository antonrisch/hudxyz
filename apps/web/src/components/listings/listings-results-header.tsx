import Link from "next/link";

import type { ListingType } from "@/db/schema";
import { appsBrowsePath } from "@/lib/apps/browse-params";
import type { CategoryCount, ListingSort } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

export type ResultsHeaderState = {
  title: string;
  description?: string;
  count: number;
  listingType?: ListingType;
  categorySlug?: string;
  sort: ListingSort;
  categories: CategoryCount[];
};

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function ListingsResultsHeader({ state }: { state: ResultsHeaderState }) {
  const typeOptions: Array<{ value?: ListingType; label: string }> = [
    { value: undefined, label: "All" },
    { value: "app", label: "Apps" },
    { value: "game", label: "Games" },
  ];

  const sortOptions: Array<{ value: ListingSort; label: string }> = [
    { value: "new", label: "New" },
    { value: "popular", label: "Popular" },
  ];

  return (
    <header className="space-y-4">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{state.title}</h1>
        {state.description ? (
          <p className="mt-2 text-base text-muted-foreground">{state.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {state.count === 1 ? "1 result" : `${state.count.toLocaleString()} results`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {typeOptions.map((option) => (
          <FilterLink
            key={option.label}
            href={appsBrowsePath({
              listingType: option.value,
              categorySlug: state.categorySlug,
              sort: state.sort,
            })}
            active={state.listingType === option.value}
          >
            {option.label}
          </FilterLink>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {sortOptions.map((option) => (
          <FilterLink
            key={option.value}
            href={appsBrowsePath({
              listingType: state.listingType,
              categorySlug: state.categorySlug,
              sort: option.value,
            })}
            active={state.sort === option.value}
          >
            {option.label}
          </FilterLink>
        ))}
      </div>

      {state.categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <FilterLink
            href={appsBrowsePath({ listingType: state.listingType, sort: state.sort })}
            active={!state.categorySlug}
          >
            All categories
          </FilterLink>
          {state.categories.map((category) => (
            <FilterLink
              key={category.slug}
              href={appsBrowsePath({
                listingType: state.listingType,
                categorySlug: category.slug,
                sort: state.sort,
              })}
              active={state.categorySlug === category.slug}
            >
              {category.name}
            </FilterLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}
