import Link from "next/link";

import { Logo } from "@/components/layout/logo";
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
      <div className="page-px mx-auto flex h-(--header-h) w-full max-w-6xl items-center">
        <Logo />
        <nav className="ml-8 flex gap-6 pt-0.5">
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
        <Link
          href="/apps/submit"
          className={cn(buttonVariants({ variant: "brand" }), "ml-auto shrink-0")}
        >
          Submit
        </Link>
      </div>
    </header>
  );
}
