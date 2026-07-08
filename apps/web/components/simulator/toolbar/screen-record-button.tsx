"use client";

import { RecordIcon } from "@/components/icons/record";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

export function ScreenRecordButton({ className }: { className?: string }) {
  const { recordScreen, isRecording, recordCountdown } = useSimulator();
  const canCapture = useSimulatorState((s) => s.screen === "app" && s.status === "ready");
  const showWelcome = useSimulatorState((s) => s.screen === "app" && s.status === "idle");
  const countingDown = recordCountdown !== null;

  const onClick = () => {
    if (isRecording || (canCapture && !countingDown)) {
      recordScreen();
      return;
    }
    if (showWelcome) {
      toast.message("Enter a URL to record your web app");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={
              isRecording
                ? "Stop recording"
                : countingDown
                  ? "Recording countdown"
                  : "Start recording"
            }
            aria-pressed={isRecording}
            className={cn(isRecording && "border-destructive text-destructive", className)}
            onMouseDown={dropFocus}
            onClick={onClick}
          >
            <RecordIcon className={cn(isRecording && "animate-pulse")} />
          </Button>
        }
      />
      <TooltipContent>
        {isRecording
          ? "Stop recording"
          : countingDown
            ? `Recording in ${recordCountdown}…`
            : "Record stage"}
      </TooltipContent>
    </Tooltip>
  );
}
