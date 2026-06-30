import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// hudbox logo: pixel mark + wordmark; always routes to the emulator.
export function Logo({ className, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href="/emulator"
      className={cn(
        "inline-flex items-center gap-2 text-xl font-bold tracking-tighter hover:underline",
        className,
      )}
      {...props}
    >
      <Image
        src="/icon.svg"
        alt=""
        aria-hidden
        width={20}
        height={20}
        className="size-6.5 shrink-0 [image-rendering:pixelated] rounded-xs"
      />
      hud.xyz
    </Link>
  );
}
