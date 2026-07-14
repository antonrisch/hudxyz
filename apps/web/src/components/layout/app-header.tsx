import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SearchCommand } from "@/components/layout/search-command";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const SITE_NAV = [
  { label: "Home", href: "/" },
  { label: "Simulator", href: "/simulator" },
  { label: "Apps and games", href: "/apps" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="page-px mx-auto flex h-(--header-h) w-full max-w-6xl items-center gap-3">
        <Logo />
        <nav className="ml-5 hidden items-center gap-6 pt-0.5 sm:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base font-medium text-foreground hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <SearchCommand />
          <Link
            href="/apps/submit"
            className={cn(buttonVariants({ variant: "brand" }), "shrink-0")}
          >
            Submit App
          </Link>
        </div>
      </div>
    </header>
  );
}
