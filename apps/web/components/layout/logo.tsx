import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hudbox logo: pixel mark + wordmark; always routes to the emulator.
export function Logo({ className, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href="/emulator"
      className={cn(
        "inline-flex items-center gap-2 text-xl font-bold tracking-tighter font-mono leading-relaxed hover:underline",
        className,
      )}
      {...props}
    >
      <img
        src="/hudxyz_icon.svg"
        alt=""
        aria-hidden
        width={20}
        height={20}
        className="size-7 shrink-0 [image-rendering:pixelated]"
      />
      HUD.XYZ
    </Link>
  );
}
