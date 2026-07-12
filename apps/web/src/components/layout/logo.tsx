import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hud.xyz logo: pixel mark + wordmark; routes to the site home.
export function Logo({
  className,
  showWordmarkOnMobile = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { showWordmarkOnMobile?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="hud.xyz home"
      className={cn(
        "inline-flex items-center gap-2 text-2xl font-bold tracking-tighter hover:underline",
        className,
      )}
      {...props}
    >
      <img
        src="/icon.svg"
        alt=""
        width={40}
        height={40}
        className="size-9 shrink-0 sm:size-7.5 [image-rendering:pixelated]"
      />
      <span className={cn(!showWordmarkOnMobile && "hidden sm:inline")}>hud.xyz</span>
    </Link>
  );
}
