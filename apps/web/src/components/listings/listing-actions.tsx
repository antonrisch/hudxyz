"use client";

import { Glasses } from "lucide-react";
import Link from "next/link";

import { ListingOpenDialog } from "@/components/listings/listing-open-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingActions({
  launchUrl,
  appName,
  className,
}: {
  launchUrl: string;
  appName: string;
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
      <ListingOpenDialog
        name={appName}
        launchUrl={launchUrl}
        variant="outline"
        className="min-w-0 w-full sm:w-auto"
      />
    </div>
  );
}
