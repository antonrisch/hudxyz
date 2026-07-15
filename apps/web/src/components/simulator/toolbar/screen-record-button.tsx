"use client";

import { useSyncExternalStore } from "react";
import { RecordIcon, RecordingIcon } from "@/components/icons/record";
import { toast } from "sonner";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { canUseRegionCapture } from "@/lib/simulator/record";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

const UNSUPPORTED_RECORD_TOOLTIP =
  "Screen recording requires Chrome or Edge browser due to region capture support.";

function subscribeNever() {
  return () => {};
}

function useRegionCaptureSupported() {
  return useSyncExternalStore(subscribeNever, canUseRegionCapture, () => false);
}

export function ScreenRecordButton({
  className,
  size = "icon",
  showLabel = false,
}: {
  className?: string;
  size?: ButtonSize;
  showLabel?: boolean;
}) {
  const { recordScreen, isRecording } = useSimulator();
  const recordingSupported = useRegionCaptureSupported();
  const canCapture = useSimulatorState((s) => s.screen === "app" && s.status === "ready");
  const showWelcome = useSimulatorState((s) => s.screen === "app" && s.status === "idle");

  const onClick = () => {
    if (!recordingSupported) return;
    if (isRecording || canCapture) {
      recordScreen();
      return;
    }
    if (showWelcome) {
      toast.message("Enter a URL to record your web app");
    }
  };

  const tooltip = !recordingSupported
    ? UNSUPPORTED_RECORD_TOOLTIP
    : isRecording
      ? "Stop recording"
      : "Record stage";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // Disabled buttons ignore pointer events; wrap so the tooltip still opens.
          <span className={cn("inline-flex", showLabel && "w-28", className)}>
            <Button
              type="button"
              variant="outline"
              size={showLabel ? size : "icon"}
              disabled={!recordingSupported}
              aria-label={
                !recordingSupported
                  ? UNSUPPORTED_RECORD_TOOLTIP
                  : isRecording
                    ? "Stop recording"
                    : "Start recording"
              }
              aria-pressed={isRecording}
              className={cn(
                showLabel && "w-full",
                isRecording &&
                  "border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white",
              )}
              onMouseDown={dropFocus}
              onClick={onClick}
            >
              {isRecording ? (
                <RecordingIcon
                  data-icon={showLabel ? "inline-start" : undefined}
                  className="animate-pulse"
                />
              ) : (
                <RecordIcon
                  data-icon={showLabel ? "inline-start" : undefined}
                  className="text-destructive"
                />
              )}
              {showLabel ? (
                <span>
                  {isRecording ? (
                    <>
                      <span className="group-hover/button:hidden">Recording</span>
                      <span className="hidden group-hover/button:inline">Finish</span>
                    </>
                  ) : (
                    "Record"
                  )}
                </span>
              ) : null}
            </Button>
          </span>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
