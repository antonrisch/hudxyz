"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import type { VariantProps } from "class-variance-authority";

import { ListingCopyLinkRow } from "@/components/listings/listing-copy-link-row";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildDeviceSetupDeepLink } from "@/lib/simulator/search-params";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";

export function ListingOpenDialog({
  name,
  launchUrl,
  label = "Open on Glasses",
  size = "lg",
  variant = "outline",
  className,
}: {
  name: string;
  launchUrl: string;
  label?: string;
  size?: NonNullable<VariantProps<typeof buttonVariants>["size"]>;
  variant?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  className?: string;
}) {
  const isMobile = useMobileLayout();
  const [open, setOpen] = useState(false);
  const { copied, copy, resetCopied } = useCopyToClipboard();

  const title = name.trim() || "This app";
  const deviceDeepLink = buildDeviceSetupDeepLink(name, launchUrl);
  const triggerClassName = cn(
    buttonVariants({ variant, size }),
    "min-w-0 font-semibold",
    className,
  );

  if (!deviceDeepLink) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={triggerClassName}
        disabled
        onClick={() => toast.message("Could not generate install link")}
      >
        {label}
      </Button>
    );
  }

  if (isMobile) {
    return (
      <a href={deviceDeepLink} className={triggerClassName}>
        {label}
      </a>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetCopied();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant={variant} size={size} className={triggerClassName}>
            {label}
          </Button>
        }
      />
      <DialogContent className="gap-5 sm:max-w-sm" showCloseButton>
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Open {title} on your Ray-Ban Glasses
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with your phone or in the Meta AI app, or paste the link below to add{" "}
            {title} to your display.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center rounded-xl border bg-white p-3">
          <QRCode
            value={deviceDeepLink}
            size={168}
            bgColor="#ffffff"
            fgColor="#000000"
            title={title}
          />
        </div>

        <ListingCopyLinkRow
          url={deviceDeepLink}
          copied={copied}
          onCopy={() => void copy(deviceDeepLink)}
        />
      </DialogContent>
    </Dialog>
  );
}
