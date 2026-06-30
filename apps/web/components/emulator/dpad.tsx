"use client";

import type { ComponentProps, MouseEvent } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  // LayoutGrid,
  type LucideIcon,
  // Home,
  // SlidersHorizontal,
  Fullscreen,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator } from "@/components/emulator";
import { Pinch } from "../icons/pinch";

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
            size={size ?? "icon-xl"}
            aria-label={label}
            disabled={disabled}
            onMouseDown={dropFocus}
            onClick={onClick}
            className="transition-none"
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
  const { press, store, captureDisplay } = useEmulator();
  const reload = store.getState().reload;

  return (
    <TooltipProvider delay={1000}>
      <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-muted py-1 px-3 shadow-md">
        {/* host controls: reload + waveguide capture (app mode only) */}
        <div className="flex items-center gap-1.5">
          {/* <ControlButton
            Icon={SlidersHorizontal}
            label="Settings"
            onClick={() => setScreen("settings")}
          />
          <ControlButton Icon={Home} label="Home" onClick={() => setScreen("home")} /> */}
          {/* <ControlButton Icon={LayoutGrid} label="Apps" onClick={() => setScreen("apps")} /> */}
          <ControlButton
            Icon={RotateCw}
            label="Reload"
            onClick={() => {
              if (store.getState().url.trim()) reload();
            }}
          />
          <ControlButton
            Icon={Fullscreen}
            label="Screenshot"
            onClick={() => void captureDisplay()}
          />
        </div>

        {/* d-pad */}
        <div className="grid grid-cols-3 gap-0.5">
          <span />
          <ControlButton Icon={ArrowUp} label="Swipe up" onClick={() => press("up")} />
          <span />
          <ControlButton Icon={ArrowLeft} label="Swipe left" onClick={() => press("left")} />
          <ControlButton Icon={ArrowDown} label="Swipe down" onClick={() => press("down")} />
          <ControlButton Icon={ArrowRight} label="Swipe right" onClick={() => press("right")} />
        </div>

        {/* pinch (select) + back */}
        <div className="flex gap-1.5">
          <ControlButton
            size="icon-2xl"
            Icon={Pinch}
            label="Select (Index pinch)"
            onClick={() => press("select")}
          />
          <Button
            variant="outline"
            className="size-12 transition-none text-xs!"
            onMouseDown={dropFocus}
            onClick={() => press("back")}
          >
            Back
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
