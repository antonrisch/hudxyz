import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { GlobalBannerDevPreview } from "@/components/layout/global-banner-dev-preview";
import { ListingIcon } from "@/components/listings/listing-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { isDevEnvironment } from "@/lib/dev-only";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dev",
  robots: { index: false, follow: false },
};

const BUTTON_VARIANTS = [
  "default",
  "brand",
  "brand-secondary",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

const BRAND_SWATCHES = [
  { name: "brand", className: "bg-brand" },
  { name: "brand-dark", className: "bg-brand-dark" },
  { name: "brand-secondary", className: "bg-brand-secondary" },
  { name: "brand-secondary-hover", className: "bg-brand-secondary-hover" },
  { name: "brand-secondary-active", className: "bg-brand-secondary-active" },
  { name: "brand-secondary-pressed", className: "bg-brand-secondary-pressed" },
] as const;

const SURFACE_SWATCHES = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "muted", className: "bg-muted" },
  { name: "border", className: "bg-border" },
  { name: "primary", className: "bg-primary" },
  { name: "destructive", className: "bg-destructive" },
] as const;

function frame(label: string, children: React.ReactNode, className?: string) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border bg-muted/40 px-3 py-1.5">
        <p className="font-mono text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DevPage() {
  if (!isDevEnvironment()) notFound();

  return (
    <main className="page-px mx-auto w-full max-w-5xl flex-1 py-10">
      <h1 className="font-bold text-3xl tracking-tight">Primitives</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Local component and token reference. Not shipped in production builds.
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <a href="#colors" className="hover:text-foreground">
          Colors
        </a>
        <a href="#typography" className="hover:text-foreground">
          Typography
        </a>
        <a href="#buttons" className="hover:text-foreground">
          Buttons
        </a>
        <a href="#forms" className="hover:text-foreground">
          Forms
        </a>
        <a href="#item" className="hover:text-foreground">
          Item
        </a>
        <a href="#listings" className="hover:text-foreground">
          Listings
        </a>
        <a href="#global-banner" className="hover:text-foreground">
          Global banner
        </a>
      </nav>

      <div className="mt-10 space-y-16">
        <section id="colors" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Colors</h2>
            <p className="text-sm text-muted-foreground">Brand ramp and semantic surfaces.</p>
          </div>
          {frame(
            "brand",
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BRAND_SWATCHES.map((swatch) => (
                <div key={swatch.name} className="space-y-2">
                  <div className={cn("h-12 rounded-lg border border-border", swatch.className)} />
                  <p className="font-mono text-xs text-muted-foreground">{swatch.name}</p>
                </div>
              ))}
            </div>,
          )}
          {frame(
            "surfaces",
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SURFACE_SWATCHES.map((swatch) => (
                <div key={swatch.name} className="space-y-2">
                  <div className={cn("h-12 rounded-lg border border-border", swatch.className)} />
                  <p className="font-mono text-xs text-muted-foreground">{swatch.name}</p>
                </div>
              ))}
            </div>,
          )}
        </section>

        <section id="typography" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Typography</h2>
            <p className="text-sm text-muted-foreground">Archivo sans, semantic text tokens.</p>
          </div>
          {frame(
            "scale",
            <div className="space-y-4">
              <p className="font-bold text-3xl tracking-tight">Heading / 3xl bold</p>
              <p className="text-base font-semibold">Title / base semibold</p>
              <p className="text-sm">Body / sm</p>
              <p className="text-sm text-muted-foreground">Muted / sm</p>
              <p className="font-mono text-xs text-muted-foreground">Mono / xs</p>
            </div>,
          )}
        </section>

        <section id="buttons" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Buttons</h2>
            <p className="text-sm text-muted-foreground">Variants and sizes from button.tsx.</p>
          </div>
          {frame(
            "variants · size=default",
            <div className="flex flex-wrap gap-2">
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>,
          )}
          {frame(
            "sizes · variant=default",
            <div className="flex flex-wrap items-center gap-2">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} size={size}>
                  {size}
                </Button>
              ))}
            </div>,
          )}
          {frame(
            "brand · sizes",
            <div className="flex flex-wrap items-center gap-2">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant="brand" size={size}>
                  {size}
                </Button>
              ))}
            </div>,
          )}
          {frame(
            "brand-secondary · sizes",
            <div className="flex flex-wrap items-center gap-2">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant="brand-secondary" size={size}>
                  {size}
                </Button>
              ))}
            </div>,
          )}
          {frame(
            "icon buttons",
            <div className="flex flex-wrap items-center gap-2">
              <Button size="icon-xs" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon-sm" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon-lg" variant="brand" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon-xl" variant="brand-secondary" aria-label="Add">
                <Plus />
              </Button>
            </div>,
          )}
          {frame(
            "states",
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button variant="brand-secondary" aria-pressed>
                Pressed
              </Button>
            </div>,
          )}
        </section>

        <section id="forms" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Forms</h2>
            <p className="text-sm text-muted-foreground">Inputs, labels, toggles.</p>
          </div>
          {frame(
            "input",
            <div className="max-w-sm space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dev-input">Label</Label>
                <Input id="dev-input" placeholder="Placeholder" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-input-disabled">Disabled</Label>
                <Input id="dev-input-disabled" placeholder="Disabled" disabled />
              </div>
            </div>,
          )}
          {frame(
            "toggle · switch",
            <div className="flex flex-wrap items-center gap-6">
              <Toggle aria-label="Toggle">Toggle</Toggle>
              <Toggle variant="outline" aria-label="Toggle outline">
                Outline
              </Toggle>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <Label>Switch</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch size="sm" />
                <Label>Switch sm</Label>
              </div>
            </div>,
          )}
        </section>

        <section id="item" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Item</h2>
            <p className="text-sm text-muted-foreground">
              shadcn item primitive for settings rows.
            </p>
          </div>
          {frame(
            "variants",
            <ItemGroup>
              <Item>
                <ItemMedia variant="icon">
                  <Plus />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Default item</ItemTitle>
                  <ItemDescription>Description for a settings or picker row.</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button size="sm" variant="outline">
                    Action
                  </Button>
                </ItemActions>
              </Item>
              <Separator />
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>Outline</ItemTitle>
                  <ItemDescription>Outlined container variant.</ItemDescription>
                </ItemContent>
              </Item>
              <Separator />
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle>Muted</ItemTitle>
                  <ItemDescription>Muted background variant.</ItemDescription>
                </ItemContent>
              </Item>
            </ItemGroup>,
          )}
        </section>

        <section id="listings" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Listings</h2>
            <p className="text-sm text-muted-foreground">Directory-specific primitives.</p>
          </div>
          {frame(
            "listing-icon · rounded-squircle",
            <div className="flex flex-wrap items-end gap-4">
              <ListingIcon src="/suggested-apps/texas-holdem.png" alt="" size={48} />
              <ListingIcon src="/suggested-apps/texas-holdem.png" alt="" size={64} />
              <ListingIcon src="/suggested-apps/tools.svg" alt="" size={64} />
              <ListingIcon src={null} alt="" size={64} />
            </div>,
          )}
          {frame(
            "listing-row actions",
            <div className="flex flex-wrap gap-2">
              <Button variant="brand-secondary" size="sm">
                View
              </Button>
              <Button variant="brand" size="lg">
                Open in simulator
              </Button>
            </div>,
          )}
        </section>

        <section id="global-banner" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Global banner</h2>
            <p className="text-sm text-muted-foreground">
              Non-modal corner promo (Raycast/Glaze-style). Reusable via{" "}
              <code className="font-mono text-xs">GlobalBanner</code> /{" "}
              <code className="font-mono text-xs">HudGlobalBanner</code>.
            </p>
          </div>
          {frame("hud-global-banner", <GlobalBannerDevPreview />)}
        </section>
      </div>
    </main>
  );
}
