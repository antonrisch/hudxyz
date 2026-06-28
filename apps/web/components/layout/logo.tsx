import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { SquareDashedMousePointer } from "lucide-react";

// hudbox logo: volt tile mark + wordmark; presentational — wrap in a link where it should navigate.
export function Logo({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xl font-semibold tracking-tighter",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="inline-flex size-6 items-center justify-center rounded-md bg-volt text-black"
      >
        <SquareDashedMousePointer className="size-5" strokeWidth={1.75} fill="white" />
      </span>
      Hudbox
    </span>
  );
}
