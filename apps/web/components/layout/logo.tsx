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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="size-7 shrink-0 [image-rendering:pixelated] rounded-md"
      >
        <rect width="20" height="20" className="fill-teal" />
        <path
          fill="#000"
          d="M19,7L1,7L1,9L2,9.036L2,10L3,10L3,11L4,11L4,12L7,12L7,11L8,11L8,10L9,10L9,9L11,9L11,10L12,10L12,11L13,11L13,12L16,12L16,11L17,11L17,10L18,10L18,9L19,9L19,7Z"
        />
        <path
          className="fill-white"
          d="M6,11L5,11L5,10L4,10L4,9L3,9L3,8L4,8L4,9L5,9L5,10L6,10L6,11"
        />
        <path
          className="fill-white"
          d="M15,11L14,11L14,10L13,10L13,9L12,9L12,8L13,8L13,9L14,9L14,10L15,10L15,11"
        />
      </svg>
      hud.xyz
    </Link>
  );
}
