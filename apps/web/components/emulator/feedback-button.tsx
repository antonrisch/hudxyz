"use client";

import type { MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export const FEEDBACK_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("MRBD Emulator Feedback")}`;

export function FeedbackButton({ className, fullWidth }: { className?: string; fullWidth?: boolean }) {
  return (
    <a
      href={FEEDBACK_MAILTO}
      aria-label="Send feedback"
      onMouseDown={dropFocus}
      className={cn(
        buttonVariants({ variant: "secondary", size: "lg" }),
        "shrink-0 max-md:size-9 max-md:px-0 border-border!",
        fullWidth && "w-full max-md:h-10 max-md:w-full max-md:px-3",
        className,
      )}
    >
      <span className={fullWidth ? undefined : "hidden md:inline"}>Send feedback</span>
      <ArrowUpRight className={cn(fullWidth && "ml-auto")} />
    </a>
  );
}
