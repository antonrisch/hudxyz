"use client";

import type { ReactNode } from "react";
import { Glasses } from "lucide-react";
import Link from "next/link";

import { ListingOpenDialog } from "@/components/listings/listing-open-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingActions({
  launchUrl,
  appName,
  share,
  className,
}: {
  launchUrl: string;
  appName: string;
  share?: ReactNode;
  className?: string;
}) {
  const simulatorHref = `/simulator?url=${encodeURIComponent(launchUrl)}`;

  return (
    <div className={cn("flex w-full flex-col gap-2 sm:w-auto sm:flex-row", className)}>
      <Link
        href={simulatorHref}
        className={cn(
          buttonVariants({ variant: "brand", size: "lg" }),
          "min-w-0 w-full font-semibold sm:w-auto",
        )}
      >
        <Glasses data-icon="inline-start" />
        Try in Simulator
      </Link>
      <div className="flex w-full items-stretch gap-2 sm:contents">
        <ListingOpenDialog
          name={appName}
          launchUrl={launchUrl}
          variant="outline"
          className="min-w-0 flex-1 sm:flex-none sm:w-auto"
        />
        {share}
      </div>
    </div>
  );
}
