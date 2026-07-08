"use client";

import { RecordIcon } from "@/components/icons/record";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

export function ScreenRecordButton({ className }: { className?: string }) {
  const { recordScreen, isRecording } = useSimulator();
  const canCapture = useSimulatorState((s) => s.screen === "app" && s.status === "ready");
  const active = isRecording || canCapture;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            aria-pressed={isRecording}
            disabled={!active}
            className={cn(isRecording && "border-destructive text-destructive", className)}
            onMouseDown={dropFocus}
            onClick={() => active && recordScreen()}
          >
            <RecordIcon className={cn(isRecording && "animate-pulse")} />
          </Button>
        }
      />
      <TooltipContent>{isRecording ? "Stop recording" : "Record stage"}</TooltipContent>
    </Tooltip>
  );
}
