"use client";

import { Dock, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

export function ToolbarPlacementButton({ className }: { className?: string }) {
  const { store } = useSimulator();
  const docked = useSimulatorState((s) => s.toolbarPlacement === "sidebar");

  const onClick = () => {
    store.getState().setToolbarPlacement(docked ? "floaty" : "sidebar");
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={docked ? "Move toolbar to canvas" : "Move toolbar to sidebar"}
            aria-pressed={docked}
            className={cn(className)}
            onMouseDown={dropFocus}
            onClick={onClick}
          >
            {docked ? <Dock /> : <PanelRightClose />}
          </Button>
        }
      />
      <TooltipContent>
        {docked ? "Move toolbar to canvas" : "Move toolbar to sidebar"}
      </TooltipContent>
    </Tooltip>
  );
}
