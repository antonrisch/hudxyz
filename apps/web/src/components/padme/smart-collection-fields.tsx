"use client";

import type { CategoryDefinition } from "@/lib/category/categories";
import type { ListingType, SmartSort } from "@/db/schema";
import { Field, FieldLabel } from "@/components/ui/field";

export type SmartCollectionValues = {
  filterListingType: ListingType | null;
  filterCategorySlug: string | null;
  smartSort: SmartSort;
  itemLimit: number;
};

export function SmartCollectionFields({
  values,
  categories,
  disabled,
  onChange,
}: {
  values: SmartCollectionValues;
  categories: readonly CategoryDefinition[];
  disabled?: boolean;
  onChange: (patch: Partial<SmartCollectionValues>) => void;
}) {
  const categoryOptions = values.filterListingType
    ? categories.filter((category) => category.listingType === values.filterListingType)
    : categories;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="smart-listing-type">Listing type</FieldLabel>
        <select
          id="smart-listing-type"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          value={values.filterListingType ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            onChange({
              filterListingType: next === "" ? null : (next as ListingType),
              filterCategorySlug: null,
            });
          }}
        >
          <option value="">All</option>
          <option value="app">Apps</option>
          <option value="game">Games</option>
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor="smart-category">Category</FieldLabel>
        <select
          id="smart-category"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          value={values.filterCategorySlug ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            onChange({ filterCategorySlug: next === "" ? null : next });
          }}
        >
          <option value="">All categories</option>
          {categoryOptions.map((category) => (
            <option key={`${category.listingType}:${category.slug}`} value={category.slug}>
              {category.name}
              {!values.filterListingType ? ` (${category.listingType})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor="smart-sort">Sort</FieldLabel>
        <select
          id="smart-sort"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          value={values.smartSort}
          disabled={disabled}
          onChange={(event) => onChange({ smartSort: event.target.value as SmartSort })}
        >
          <option value="new">New</option>
          <option value="popular">Popular</option>
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor="smart-limit">Hub item limit</FieldLabel>
        <input
          id="smart-limit"
          type="number"
          min={3}
          max={24}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          value={values.itemLimit}
          disabled={disabled}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(parsed)) onChange({ itemLimit: parsed });
          }}
        />
      </Field>
    </div>
  );
}
