import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hud.xyz logo: pixel mark + wordmark; always routes to the emulator.
export function Logo({ className, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href="/emulator"
      className={cn(
        "inline-flex items-center gap-2 sm:text-2xl text-lg font-bold tracking-tighter hover:underline",
        className,
      )}
      {...props}
    >
      <img
        src="/icon.svg"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-md [image-rendering:pixelated]"
      />
      hud.xyz
    </Link>
  );
}
