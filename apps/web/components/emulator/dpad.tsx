"use client";

import type { ComponentProps, MouseEvent } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  LayoutGrid,
  type LucideIcon,
  Home,
  SlidersHorizontal,
} from "lucide-react";
import { Pinch } from "@/components/icons/pinch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

function ControlButton({
  size,
  Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  size?: ComponentProps<typeof Button>["size"];
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "default" : "outline"}
            size={size ? size : "icon"}
            aria-label={label}
            disabled={disabled}
            onMouseDown={dropFocus}
            onClick={onClick}
          >
            <Icon />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// gesture controls + os nav. the d-pad emits intents; the nav buttons switch the screen.
export function Dpad() {
  const { press, store } = useEmulator();
  const setScreen = store.getState().setScreen;

  return (
    <TooltipProvider delay={1000}>
      <div className="flex items-center gap-6 bg-muted rounded-lg px-2 py-0.5 border">
        {/* os nav */}
        <div className="grid grid-cols-3 gap-1.5">
          <ControlButton Icon={SlidersHorizontal} label="Settings" onClick={() => setScreen("settings")} />
          <ControlButton Icon={Home} label="Home" onClick={() => setScreen("home")} />
          <ControlButton Icon={LayoutGrid} label="Apps" onClick={() => setScreen("apps")} />
        </div>

        {/* d-pad */}
        <div className="grid grid-cols-3 gap-1.5">
          <span />
          <ControlButton Icon={ArrowUp} label="Swipe up" onClick={() => press("up")} />
          <span />
          <ControlButton Icon={ArrowLeft} label="Swipe left" onClick={() => press("left")} />
          <ControlButton Icon={ArrowDown} label="Swipe down" onClick={() => press("down")} />
          <ControlButton Icon={ArrowRight} label="Swipe right" onClick={() => press("right")} />
        </div>

        {/* pinch (select) + back — pinch is a larger outline button */}
        <div className="grid grid-cols-2 gap-1.5">
          <ControlButton
            Icon={Pinch}
            label="Select (Index pinch)"
            onClick={() => press("select")}
          />
          <ControlButton Icon={Undo2} label="Back (Middle pinch)" onClick={() => press("back")} />
        </div>
      </div>
    </TooltipProvider>
  );
}
