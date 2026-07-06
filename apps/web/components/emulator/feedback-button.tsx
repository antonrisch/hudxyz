"use client";

import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { dropFocus } from "@/lib/emulator/drop-focus";
import { cn } from "@/lib/utils";

export const FEEDBACK_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("hud.xyz emulator feedback")}`;
export const DIRECTORY_MAILTO = `mailto:antonhudxyz@gmail.com?subject=${encodeURIComponent("hud.xyz app directory request")}`;

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
