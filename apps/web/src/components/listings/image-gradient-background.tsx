import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Soft color wash from an image. Disc size is floored so blur stays proportional
 * on narrow banners (otherwise blur-3xl eats the color on mobile).
 */
export function ImageGradientBackground({
  src,
  color,
  className,
  children,
}: {
  src: string;
  color?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={color ? { backgroundColor: color } : undefined}
    >
      {/*
        min-w keeps the filtered bitmap large on narrow containers.
        Rotate the wrapper only (transform → compositor).
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center motion-safe:animate-[spin_60s_linear_infinite] motion-reduce:animate-none"
      >
        <img
          src={src}
          alt=""
          decoding="async"
          className="aspect-square w-[max(200%,42rem)] max-w-none scale-150 rounded-full object-cover blur-2xl brightness-150 contrast-125 saturate-[3] sm:blur-3xl lg:blur-[5rem]"
        />
      </div>
      {/* Bottom veil — white in light mode, black in dark; stronger on large screens */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent from-20% to-white/20 dark:to-black/25 sm:to-white/30 dark:sm:to-black/40 lg:to-white/40 dark:lg:to-black/55"
      />
      {children}
    </div>
  );
}
