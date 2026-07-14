"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ProductHuntMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="20" cy="20" r="20" fill="#FF6154" />
      <path
        d="M22.667 20H17.778V15.556h4.889a2.222 2.222 0 1 1 0 4.444Zm0-8.889H13.333v17.778h4.445v-4.445h4.889a6.667 6.667 0 0 0 0-13.333Z"
        fill="#fff"
      />
    </svg>
  );
}

export function GlobalBanner({
  open,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  icon,
  children,
  className,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
      modal={false}
      disablePointerDismissal
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          data-slot="global-banner"
          initialFocus={false}
          finalFocus={false}
          className={cn(
            "fixed right-4 bottom-4 z-50 flex w-[min(100%-2rem,17.8125rem)] flex-col gap-3 rounded-2xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none",
            "supports-backdrop-filter:bg-popover/92 supports-backdrop-filter:backdrop-blur-md",
            "duration-200 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-2",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            {icon ? (
              <div className="size-10 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
                {icon}
              </div>
            ) : null}
            <DialogPrimitive.Close
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="-mr-1 -mt-1 ml-auto text-muted-foreground hover:text-foreground"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Dismiss</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-1.5">
            <DialogPrimitive.Title className="text-base leading-snug font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          </div>

          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** hudxyz.com promo defaults — reuse later on marketing surfaces. */
export function HudGlobalBanner({
  open,
  defaultOpen = true,
  onOpenChange,
  className,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  return (
    <GlobalBanner
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      className={className}
      icon={
        <img
          src="/icon.svg"
          alt=""
          width={40}
          height={40}
          className="size-full [image-rendering:pixelated]"
        />
      }
      title="Meet hudxyz.com"
      description="Wearable apps for Meta Ray-Ban Display. Discover community apps and try them in the simulator."
    >
      <a
        href="#"
        aria-label="Featured on Product Hunt"
        className="flex w-full items-center gap-2.5 rounded-xl bg-[#1a1a1a] px-3 py-2.5 text-white transition-opacity hover:opacity-90 active:opacity-80"
      >
        <ProductHuntMark className="size-7 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="text-[0.625rem] font-medium tracking-wide text-white/70 uppercase">
            Featured on
          </span>
          <span className="mt-0.5 text-sm font-semibold tracking-tight">Product Hunt</span>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-0.5 text-white/90" aria-hidden>
          <svg viewBox="0 0 12 8" className="size-2.5 fill-current" aria-hidden>
            <path d="M6 0 12 8H0z" />
          </svg>
          <span className="text-[0.6875rem] font-semibold tabular-nums leading-none">—</span>
        </span>
      </a>
    </GlobalBanner>
  );
}
