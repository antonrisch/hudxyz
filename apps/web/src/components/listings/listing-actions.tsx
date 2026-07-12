"use client";

import { Check, ChevronDown, Glasses, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

import { ListingOpenDialog } from "@/components/listings/listing-open-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
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
  const { copied: appLinkCopied, copy: copyAppLink } = useCopyToClipboard();

  const simulatorHref = `/simulator?url=${encodeURIComponent(launchUrl)}`;
  const dropdownActionClassName = cn(
    buttonVariants({ variant: "ghost", size: "lg" }),
    "w-full justify-start focus:bg-transparent focus:text-foreground data-highlighted:bg-muted data-highlighted:text-foreground dark:data-highlighted:bg-muted/50",
  );

  return (
    <div className={cn("flex w-full items-stretch gap-2 sm:w-auto", className)}>
      <ListingOpenDialog name={appName} launchUrl={launchUrl} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="icon-lg" aria-label="More actions">
              <ChevronDown />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="flex w-52 flex-col gap-0.5 p-1">
          <DropdownMenuLinkItem
            render={<Link href={simulatorHref} />}
            closeOnClick
            className={dropdownActionClassName}
          >
            <Glasses data-icon="inline-start" />
            Try in Simulator
          </DropdownMenuLinkItem>
          <DropdownMenuItem
            onClick={() => void copyAppLink(launchUrl)}
            className={dropdownActionClassName}
          >
            {appLinkCopied ? (
              <Check data-icon="inline-start" />
            ) : (
              <LinkIcon data-icon="inline-start" />
            )}
            {appLinkCopied ? "Copied" : "Copy link"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
