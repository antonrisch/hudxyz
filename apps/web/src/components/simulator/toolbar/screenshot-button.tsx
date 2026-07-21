"use client";

import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";

export function ScreenshotButton({ className }: { className?: string }) {
  const { captureDisplay } = useSimulator();
  const isMobile = useMobileLayout();
  const canCapture = useSimulatorState((s) => s.screen === "app" && s.status === "ready");
  const showWelcome = useSimulatorState((s) => s.screen === "app" && s.status === "idle");

  const onClick = () => {
    if (canCapture) {
      void captureDisplay("button");
      return;
    }
    if (showWelcome) {
      toast.message("Enter a URL to screenshot your web app");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={isMobile ? "icon-lg" : "icon"}
            aria-label="Screenshot"
            className={cn(className)}
            onMouseDown={dropFocus}
            onClick={onClick}
          >
            <Camera />
          </Button>
        }
      />
      <TooltipContent>Screenshot stage</TooltipContent>
    </Tooltip>
  );
}
