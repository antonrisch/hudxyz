"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/padme", label: "Apps" },
  { href: "/padme/collections", label: "Collections" },
] as const;

function isActive(pathname: string, href: string): boolean {
  // Longest matching nav prefix wins so /padme/collections isn't also "Apps".
  const best = NAV.reduce<(typeof NAV)[number] | null>((acc, item) => {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) return acc;
    if (!acc || item.href.length > acc.href.length) return item;
    return acc;
  }, null);
  return best?.href === href;
}

export function PadmeNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "font-medium hover:text-foreground",
              active ? "text-foreground" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
