import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_STYLES = {
  default: {
    title: "text-3xl",
    chevron: "size-7",
  },
  sm: {
    title: "text-xl",
    chevron: "size-5",
  },
} as const;

export function ChevronTitle({
  href,
  children,
  description,
  size = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  description?: string | null;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}) {
  const styles = SIZE_STYLES[size];

  return (
    <div className={cn("min-w-0", className)}>
      <h2 className={cn("font-bold tracking-tight", styles.title)}>
        <Link
          href={href}
          className="group inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {children}
          <ChevronRight
            className={cn(
              "text-muted-foreground/60 transition-all ease-in-out group-hover:translate-x-0.5 group-hover:text-foreground",
              styles.chevron,
            )}
            strokeWidth={2.5}
            aria-hidden
          />
        </Link>
      </h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
