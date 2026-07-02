"use client";

import type { MouseEvent } from "react";
import { Camera, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEmulator, useEmulatorState } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export function ShareMenu() {
  const { captureDisplay } = useEmulator();
  const canCapture = useEmulatorState((s) => s.screen === "app" && s.status === "ready");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="lg">
            <Share2 className="sm:hidden inline" />
            <span className="sm:inline hidden">Share</span>
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(18rem,calc(100vw-1rem))] gap-4 p-4"
      >
        <PopoverHeader>
          <PopoverTitle className="text-base">Share</PopoverTitle>
          <PopoverDescription>Export a screenshot of the display.</PopoverDescription>
        </PopoverHeader>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!canCapture}
          aria-label="Screenshot"
          onMouseDown={dropFocus}
          onClick={() => canCapture && void captureDisplay()}
          className="w-full justify-center gap-2"
        >
          <Camera className="size-4" />
          Screenshot
        </Button>
      </PopoverContent>
    </Popover>
  );
}
