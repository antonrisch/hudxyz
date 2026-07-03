"use client";

import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export const FEEDBACK_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("MRBD Emulator Feedback")}`;

export function FeedbackButton({ className }: { className?: string }) {
  return (
    <a
      href={FEEDBACK_MAILTO}
      aria-label="Feedback"
      onMouseDown={dropFocus}
      className={cn(
        buttonVariants({ variant: "secondary", size: "lg" }),
        "shrink-0 border-border!",
        className,
      )}
    >
      <Heart className="inline fill-rose-500 text-rose-500 sm:hidden" />
      <span className="hidden sm:inline">Feedback</span>
      <Heart className="hidden fill-rose-500 text-rose-500 sm:inline" />
    </a>
  );
}
