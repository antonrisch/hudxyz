"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { listingTypes, type ListingType } from "@/db/schema";
import { DIRECTORY_MAILTO } from "@/lib/simulator/config";
import { cn } from "@/lib/utils";

const link = "text-sm text-muted-foreground hover:text-foreground";

const APPS_NAV = [
  { key: "home", label: "Home", href: "/apps" },
  { key: "app", label: "Apps", href: "/apps?type=app" },
  { key: "game", label: "Games", href: "/apps?type=game" },
] as const;

function Shell({ nav, trailing }: { nav?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto flex h-(--header-h) w-full max-w-7xl items-center px-6">
        <Logo />
        {nav}
        {trailing ? <div className="ml-auto shrink-0">{trailing}</div> : null}
      </div>
    </header>
  );
}

function AppHeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const active =
    type && (listingTypes as readonly string[]).includes(type) ? (type as ListingType) : "home";

  if (pathname === "/apps") {
    return (
      <Shell
        nav={
          <nav className="ml-8 flex gap-5">
            {APPS_NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(link, active === item.key && "font-medium text-foreground")}
                aria-current={active === item.key ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        }
        trailing={
          <a href={DIRECTORY_MAILTO} className={link}>
            Submit
          </a>
        }
      />
    );
  }

  if (pathname.startsWith("/apps/")) {
    return (
      <Shell
        trailing={
          <Link href="/apps" className={link}>
            All apps
          </Link>
        }
      />
    );
  }

  if (pathname === "/dev") {
    return <Shell trailing={<span className="text-xs text-muted-foreground">dev</span>} />;
  }

  return <Shell />;
}

export function AppHeader() {
  return (
    <Suspense fallback={<Shell />}>
      <AppHeaderContent />
    </Suspense>
  );
}
