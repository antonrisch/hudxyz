import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hudbox logo: pixel mark + wordmark; presentational — wrap in a link where it should navigate.
export function Logo({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
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
      hud.xyz
    </span>
  );
}
