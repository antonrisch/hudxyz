"use client";

import type { MouseEvent } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Grab,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Intent } from "@/lib/emulator/store";
import { useEmulator } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

// 3x3 d-pad grid; null = spacer. order: up / left·pinch·right / down
const PAD: (null | { intent: Intent; Icon: LucideIcon; label: string })[] = [
  null,
  { intent: "up", Icon: ArrowUp, label: "Swipe up" },
  null,
  { intent: "left", Icon: ArrowLeft, label: "Swipe left" },
  { intent: "select", Icon: Grab, label: "Pinch (select)" },
  { intent: "right", Icon: ArrowRight, label: "Swipe right" },
  null,
  { intent: "down", Icon: ArrowDown, label: "Swipe down" },
  null,
];

// gesture controls: d-pad (UDLR) + pinch (select) + back. each emits an intent.
export function Dpad() {
  const { press } = useEmulator();

  return (
    <TooltipProvider delay={300}>
      <div className="flex items-center gap-8">
        <div className="grid grid-cols-3 gap-2">
          {PAD.map((c, i) =>
            c ? (
              <Tooltip key={c.intent}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={c.label}
                      onMouseDown={dropFocus}
                      onClick={() => press(c.intent)}
                    >
                      <c.Icon />
                    </Button>
                  }
                />
                <TooltipContent>{c.label}</TooltipContent>
              </Tooltip>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Back"
                onMouseDown={dropFocus}
                onClick={() => press("back")}
              >
                <Undo2 />
              </Button>
            }
          />
          <TooltipContent>Back</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
