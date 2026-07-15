import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/json-ld";
import { CategoryRow } from "@/components/listings/category-row";
import { categoryPath } from "@/lib/apps/browse-params";
import { listPublishedCategoryCounts } from "@/lib/apps/queries";
import { directorySocialMetadata, itemListJsonLd } from "@/lib/apps/seo";

const PAGE_COPY = {
  title: "Categories",
  description: "Browse Meta Ray-Ban Display apps and games by category.",
} as const;

export const metadata: Metadata = {
  title: PAGE_COPY.title,
  description: PAGE_COPY.description,
  alternates: { canonical: "/apps/categories" },
  ...directorySocialMetadata({
    title: PAGE_COPY.title,
    description: PAGE_COPY.description,
    path: "/apps/categories",
  }),
};

export default async function CategoriesPage() {
  const categories = await listPublishedCategoryCounts();

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      {categories.length > 0 ? (
        <JsonLd
          data={itemListJsonLd({
            name: PAGE_COPY.title,
            description: PAGE_COPY.description,
            path: "/apps/categories",
            items: categories.map((category) => ({
              name: category.name,
              path: categoryPath(category.slug),
            })),
          })}
        />
      ) : null}
      <h1 className="font-bold text-3xl tracking-tight">{PAGE_COPY.title}</h1>
      <p className="mt-2 text-base text-muted-foreground">{PAGE_COPY.description}</p>

      {categories.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No categories with published apps yet.</p>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryRow key={category.slug} category={category} />
          ))}
        </ul>
      )}
    </main>
  );
}
