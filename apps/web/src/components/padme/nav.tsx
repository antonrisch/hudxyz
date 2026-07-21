"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PadmeNav() {
  const pathname = usePathname();
  const active = pathname === "/padme" || pathname.startsWith("/padme/");

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link
        href="/padme"
        className={cn(
          "font-medium hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        Hubs
      </Link>
    </nav>
  );
}
