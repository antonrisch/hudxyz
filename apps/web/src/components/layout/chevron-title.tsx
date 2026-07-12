import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChevronTitle({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("font-bold text-3xl tracking-tight", className)}>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
        <ChevronRight
          className="size-7 text-muted-foreground/60 transition-all ease-in-out group-hover:translate-x-1 group-hover:text-foreground"
          strokeWidth={2.5}
          aria-hidden
        />
      </Link>
    </h2>
  );
}
