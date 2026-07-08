"use client";

import { RecordIcon, RecordingIcon } from "@/components/icons/record";
import { toast } from "sonner";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

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
  const isMobile = useMobileLayout();
  const canCapture = useSimulatorState((s) => s.screen === "app" && s.status === "ready");
  const showWelcome = useSimulatorState((s) => s.screen === "app" && s.status === "idle");
  const labeled = showLabel && !isMobile;

  const onClick = () => {
    if (isRecording || canCapture) {
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
            size={labeled ? size : "icon-lg"}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            aria-pressed={isRecording}
            className={cn(
              isRecording &&
                "border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white",
              labeled && "w-28",
              className,
            )}
            onMouseDown={dropFocus}
            onClick={onClick}
          >
            {isRecording ? (
              <RecordingIcon
                data-icon={labeled ? "inline-start" : undefined}
                className="animate-pulse"
              />
            ) : (
              <RecordIcon
                data-icon={labeled ? "inline-start" : undefined}
                className="text-destructive"
              />
            )}
            {labeled ? (
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
        }
      />
      <TooltipContent>{isRecording ? "Stop recording" : "Record canvas"}</TooltipContent>
    </Tooltip>
  );
}
