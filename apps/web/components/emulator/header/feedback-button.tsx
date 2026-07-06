"use client";

import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { dropFocus } from "@/lib/emulator/input";
import { FEEDBACK_MAILTO } from "@/lib/emulator/config";
import { cn } from "@/lib/utils";

export function FeedbackButton({ className }: { className?: string }) {
  return (
    <a
      href={FEEDBACK_MAILTO}
      aria-label="Feedback"
      onMouseDown={dropFocus}
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "shrink-0", className)}
    >
      <Heart className="inline fill-rose-500 text-rose-500 sm:hidden" />
      <span className="hidden sm:inline">Feedback</span>
      <Heart className="hidden fill-rose-500 text-rose-500 sm:inline" />
    </a>
  );
}
