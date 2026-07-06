import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hud.xyz logo: pixel mark + wordmark; always routes to the simulator.
export function Logo({ className, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href="/"
      aria-label="hud.xyz home"
      className={cn(
        "inline-flex items-center gap-2 sm:text-2xl text-md font-bold tracking-tighter hover:underline",
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
      <span className="hidden sm:inline">hud.xyz</span>
    </Link>
  );
}
