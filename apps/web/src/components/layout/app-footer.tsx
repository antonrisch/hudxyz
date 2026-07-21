"use client";

import { ConsentDialogLink } from "@c15t/nextjs/components/consent-dialog-link";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { legal } from "@/lib/legal/config";
import { FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { useMountEffect } from "@/lib/use-mount-effect";
import { cn } from "@/lib/utils";

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

/** Simplified button `lg` row: h-10, px-3, rounded-xl, font-medium, base text → sm:text-sm. */
const FOOTER_ROW_CLASS =
  "flex h-10 w-full items-center rounded-xl px-3 font-medium sm:w-auto sm:text-sm";

const FOOTER_LINK_CLASS = cn(
  FOOTER_ROW_CLASS,
  "text-muted-foreground transition-colors hover:text-foreground",
);

const HOME_LINKS: readonly FooterLink[] = [
  { href: "/simulator", label: "Simulator" },
  { href: "/hubs", label: "Hub directory" },
  { href: "/hubs/submit", label: "Submit a hub" },
];

const SUPPORT_LINKS: readonly FooterLink[] = [
  { href: `mailto:${legal.contactEmail}`, label: "Contact", external: true },
  { href: FEEDBACK_MAILTO, label: "Feedback", external: true },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function PrivacySettingsLink() {
  return (
    <li>
      <ConsentDialogLink className={FOOTER_LINK_CLASS}>Privacy settings</ConsentDialogLink>
    </li>
  );
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

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
    <nav aria-labelledby={id} className="w-full min-w-0">
      <h2 id={id} className={cn(FOOTER_ROW_CLASS, "font-semibold text-foreground sm:text-base")}>
        {title}
      </h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <FooterLinkItem {...link} />
          </li>
        ))}
        {title === "Support" ? <PrivacySettingsLink /> : null}
      </ul>
    </nav>
  );
}

function FooterThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useMountEffect(() => {
    setMounted(true);
  });

  if (!mounted) {
    return <div aria-hidden className="h-10 w-full sm:w-28" />;
  }

  const currentTheme = (theme ?? "system") as ThemeOption["value"];
  const selected =
    THEME_OPTIONS.find((option) => option.value === currentTheme) ?? THEME_OPTIONS[0];
  const SelectedIcon = selected.Icon;

  return (
    <div className="relative w-full sm:w-auto">
      <SelectedIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground sm:hidden"
      />
      <NativeSelect
        aria-label="Theme"
        value={currentTheme}
        onChange={(event) => setTheme(event.target.value)}
        className={cn(
          "w-full sm:w-auto",
          "[&_select]:h-10 [&_select]:rounded-xl [&_select]:bg-background [&_select]:pl-9 [&_select]:font-medium sm:[&_select]:pl-2.5 sm:[&_select]:text-sm",
        )}
      >
        {THEME_OPTIONS.map(({ value, label }) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

/** Site footer for non-simulator pages (directory, legal, submit). */
export function AppFooter() {
  const sections: FooterSection[] = [
    { title: "Simulator & hubs", links: HOME_LINKS },
    { title: "Support", links: SUPPORT_LINKS },
  ];

  return (
    <footer id="site-footer" className="mt-auto shrink-0 bg-muted">
      <div className="page-px mx-auto max-w-6xl py-6 sm:py-8">
        <div className="grid grid-cols-1 items-start gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 px-3 sm:col-span-2">
            <Logo showWordmarkOnMobile />
            <p className="mt-2 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-sm">
              Dev tools and apps for Meta Ray-Ban Display.
            </p>
          </div>

          {sections.map((section) => (
            <FooterNavSection key={section.title} {...section} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn(FOOTER_ROW_CLASS, "text-muted-foreground")}>
            © {new Date().getFullYear()} hudxyz.com
          </p>
          <FooterThemeSelect />
        </div>
      </div>
    </footer>
  );
}
