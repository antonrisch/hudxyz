import Link from "next/link";

import { categoryPath } from "@/lib/apps/browse-params";
import type { CategoryCount } from "@/lib/apps/queries";
import { getCategoryAccent } from "@/lib/category/category-colors";
import { getCategoryIconBySlug } from "@/lib/category/category-icons";
import { cn } from "@/lib/utils";

export function CategoryRow({
  category,
  className,
}: {
  category: CategoryCount;
  className?: string;
}) {
  const Icon = getCategoryIconBySlug(category.slug);
  const accent = getCategoryAccent(category.slug);

  return (
    <li className={cn(className)}>
      <Link
        href={categoryPath(category.slug)}
        className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-input"
      >
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: accent.chip, color: accent.color }}
        >
          <Icon className="size-6" weight="duotone" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
          {category.name}
        </span>
      </Link>
    </li>
  );
}
