"use client";

import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { dropFocus } from "@/lib/simulator/input";
import { FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { cn } from "@/lib/utils";

export function FeedbackButton({ className }: { className?: string }) {
  return (
    <a
      href={FEEDBACK_MAILTO}
      aria-label="Feedback"
      onMouseDown={dropFocus}
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "shrink-0 max-sm:size-10 max-sm:px-0",
        className,
      )}
    >
      <Heart className="fill-rose-500 text-rose-500" />
      <span className="hidden sm:inline">Feedback</span>
    </a>
  );
}
