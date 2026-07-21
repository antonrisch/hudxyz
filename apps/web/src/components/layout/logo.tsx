import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hudxyz.com logo: pixel mark + wordmark; routes to the site home.
export function Logo({
  className,
  showWordmarkOnMobile = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { showWordmarkOnMobile?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="hudxyz.com home"
      className={cn("inline-flex items-center gap-2 hover:underline", className)}
      {...props}
    >
      <img
        src="/icon.svg"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 [image-rendering:pixelated] sm:size-7.5"
      />
      <span
        className={cn(
          "text-2xl font-bold leading-none tracking-tighter",
          !showWordmarkOnMobile && "hidden sm:inline",
        )}
      >
        hud.xyz
      </span>
    </Link>
  );
}
