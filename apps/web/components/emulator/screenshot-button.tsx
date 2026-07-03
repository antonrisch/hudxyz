"use client";

import type { MouseEvent } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator, useEmulatorState } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export function ScreenshotButton() {
  const { captureDisplay } = useEmulator();
  const canCapture = useEmulatorState((s) => s.screen === "app" && s.status === "ready");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="default"
            size="icon"
            aria-label="Screenshot"
            onMouseDown={dropFocus}
            onClick={() => canCapture && void captureDisplay()}
          >
            <Camera />
          </Button>
        }
      />
      <TooltipContent>Screenshot</TooltipContent>
    </Tooltip>
  );
}
