"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { categoryPath } from "@/lib/apps/browse-params";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

/** Apps → category → listing name. Slash separators. Mobile: history Back. */
export function ListingBreadcrumbs({
  listing,
  className,
}: {
  listing: ListingDetail;
  className?: string;
}) {
  const router = useRouter();
  const fallbackHref = listing.categorySlug ? categoryPath(listing.categorySlug) : "/apps";

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        aria-label="Back"
        className="rounded-md sm:hidden"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push(fallbackHref);
          }
        }}
      >
        <ArrowLeft data-icon="inline-start" />
        Back
      </Button>

      <Breadcrumb className="hidden w-fit max-w-full rounded-md bg-background px-2.5 py-1 sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/apps" />}>Apps</BreadcrumbLink>
          </BreadcrumbItem>
          {listing.categorySlug ? (
            <>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={categoryPath(listing.categorySlug)} />}>
                  {listing.categoryName}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{listing.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
