"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { dropFocus } from "@/lib/emulator/input";

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
