"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListingType } from "@/db/schema";
import { findCategoryDefinition } from "@/lib/category/categories";
import { legal } from "@/lib/legal/config";
import { DIRECTORY_MAILTO, DEVICE_MODEL, FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { useMountEffect } from "@/lib/use-mount-effect";

type FooterLink = {
  href: string;
  label: string;
  external?: true;
};

type FooterSection = {
  title: string;
  links: readonly FooterLink[];
};

type ThemeOption = {
  value: "system" | "light" | "dark";
  label: string;
  Icon: LucideIcon;
};

const FOOTER_LINK_CLASS = "underline-offset-4 hover:text-foreground hover:underline";

const FOOTER_APP_CATEGORY_SLUGS = [
  "productivity",
  "entertainment",
  "utilities",
  "navigation",
] as const;

const FOOTER_GAME_CATEGORY_SLUGS = ["casual", "puzzle", "action", "strategy"] as const;

const HOME_LINKS: readonly FooterLink[] = [
  { href: "/", label: "Simulator" },
  { href: "/apps", label: "All apps & games" },
  { href: "/apps?type=app", label: "Apps" },
  { href: "/apps?type=game", label: "Games" },
  { href: DIRECTORY_MAILTO, label: "Submit an app", external: true },
];

const SUPPORT_LINKS: readonly FooterLink[] = [
  { href: `mailto:${legal.contactEmail}`, label: "Contact", external: true },
  { href: FEEDBACK_MAILTO, label: "Feedback", external: true },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
];

function buildCategoryLinks(listingType: ListingType, slugs: readonly string[]): FooterLink[] {
  return slugs.flatMap((slug) => {
    const category = findCategoryDefinition(listingType, slug);
    if (!category) return [];
    return { href: `/apps?type=${listingType}&category=${slug}`, label: category.name };
  });
}

function footerSectionId(title: string) {
  return `footer-${title.toLowerCase().replace(/[^\w]+/g, "-")}`;
}

function FooterLinkItem({ href, label, external }: FooterLink) {
  if (external) {
    return (
      <a href={href} className={FOOTER_LINK_CLASS}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={FOOTER_LINK_CLASS}>
      {label}
    </Link>
  );
}

function FooterNavSection({ title, links }: FooterSection) {
  const id = footerSectionId(title);

  return (
    <nav aria-labelledby={id} className="min-w-0">
      <h2 id={id} className="mb-2 text-sm font-medium">
        {title}
      </h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <FooterLinkItem {...link} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useMountEffect(() => {
    setMounted(true);
  });

  if (!mounted) {
    return <div aria-hidden className="h-7 w-23" />;
  }

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      aria-label="Theme"
      value={[theme ?? "system"]}
      onValueChange={(values) => {
        const next = values[0];
        if (next) setTheme(next);
      }}
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Site footer for non-simulator pages (directory, legal, submit). */
export function AppFooter() {
  const sections: FooterSection[] = [
    { title: "Simulator & apps", links: HOME_LINKS },
    { title: "Apps", links: buildCategoryLinks("app", FOOTER_APP_CATEGORY_SLUGS) },
    { title: "Games", links: buildCategoryLinks("game", FOOTER_GAME_CATEGORY_SLUGS) },
    { title: "Support", links: SUPPORT_LINKS },
  ];

  return (
    <footer id="site-footer" className="mt-auto shrink-0 bg-muted">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 sm:col-span-2">
            <Logo className="text-lg sm:text-xl" />
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Wearable web apps and games for {DEVICE_MODEL}.
            </p>
          </div>

          {sections.map((section) => (
            <FooterNavSection key={section.title} {...section} />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} hud.xyz</p>
          <FooterThemeToggle />
        </div>
      </div>
    </footer>
  );
}
