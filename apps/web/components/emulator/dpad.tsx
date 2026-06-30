"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
  MousePointer2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator } from "@/components/emulator";
import type { Intent } from "@/lib/emulator/store";
import { cn } from "@/lib/utils";

const dropFocus = (e: MouseEvent) => e.preventDefault();

const dpadArm =
  "flex size-8 items-center justify-center bg-transparent outline-nonehover:bg-accent/60 active:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset";

const dpadCrossPath =
  "M40 0H56Q64 0 64 8V32H88Q96 32 96 40V56Q96 64 88 64H64V88Q64 96 56 96H40Q32 96 32 88V64H8Q0 64 0 56V40Q0 32 8 32H32V8Q32 0 40 0Z";

const dpadCrossClip = `path("${dpadCrossPath}")`;

function DpadArm({
  Icon,
  label,
  pressed,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            onMouseDown={dropFocus}
            onClick={onClick}
            className={cn(dpadArm, pressed && "bg-muted")}
          >
            <Icon className="size-4 shrink-0" />
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DpadCross({
  onPress,
  pressedIntents,
}: {
  onPress: (direction: "up" | "down" | "left" | "right") => void;
  pressedIntents: ReadonlySet<Intent>;
}) {
  return (
    <div className="relative inline-block size-24">
      <svg
        aria-hidden
        viewBox="-1 -1 98 98"
        overflow="visible"
        className="pointer-events-none absolute -inset-px size-[calc(100%+2px)]"
      >
        <path
          d={dpadCrossPath}
          className="fill-background stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0"
        style={{ clipPath: dpadCrossClip }}
      >
        <div />
        <DpadArm
          Icon={ArrowUp}
          label="Swipe up"
          pressed={pressedIntents.has("up")}
          onClick={() => onPress("up")}
        />
        <div />
        <DpadArm
          Icon={ArrowLeft}
          label="Swipe left"
          pressed={pressedIntents.has("left")}
          onClick={() => onPress("left")}
        />
        <div aria-hidden className="size-8" />
        <DpadArm
          Icon={ArrowRight}
          label="Swipe right"
          pressed={pressedIntents.has("right")}
          onClick={() => onPress("right")}
        />
        <div />
        <DpadArm
          Icon={ArrowDown}
          label="Swipe down"
          pressed={pressedIntents.has("down")}
          onClick={() => onPress("down")}
        />
        <div />
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-xl"
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onMouseDown={dropFocus}
            onClick={onClick}
            className={cn(
              "hover:bg-accent/60 active:bg-accent",
              pressed && "bg-accent",
            )}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// gesture controls + os nav. the d-pad emits intents; the nav buttons switch the screen.
export function Dpad() {
  const { press, pressedIntents } = useEmulator();

  return (
    <TooltipProvider delay={1000}>
      <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-muted py-1 px-3 shadow-md">
        <ControlButton
          label="Back (Middle pinch)"
          pressed={pressedIntents.has("back")}
          onClick={() => press("back")}
        >
          <Undo2 />
        </ControlButton>

        <DpadCross onPress={press} pressedIntents={pressedIntents} />

        <ControlButton
          label="Select (Index pinch)"
          pressed={pressedIntents.has("select")}
          onClick={() => press("select")}
        >
          <MousePointer2 className="-scale-x-100" fill="currentColor" />
        </ControlButton>
      </div>
    </TooltipProvider>
  );
}
