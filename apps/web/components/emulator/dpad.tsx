"use client";

import type { MouseEvent, PointerEvent, ReactNode } from "react";
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

type DirectionIntent = Extract<Intent, "up" | "down" | "left" | "right">;

const dropFocus = (e: MouseEvent) => e.preventDefault();

const dpadArm =
  "flex size-8 items-center justify-center bg-transparent outline-none hover:bg-accent/60 active:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset";

const dpadCrossPath =
  "M40 0H56Q64 0 64 8V32H88Q96 32 96 40V56Q96 64 88 64H64V88Q64 96 56 96H40Q32 96 32 88V64H8Q0 64 0 56V40Q0 32 8 32H32V8Q32 0 40 0Z";

const dpadCrossClip = `path("${dpadCrossPath}")`;

const DPAD_ARMS: { intent: DirectionIntent; Icon: LucideIcon; label: string }[] = [
  { intent: "up", Icon: ArrowUp, label: "Swipe up" },
  { intent: "left", Icon: ArrowLeft, label: "Swipe left" },
  { intent: "right", Icon: ArrowRight, label: "Swipe right" },
  { intent: "down", Icon: ArrowDown, label: "Swipe down" },
];

const DPAD_GRID = [
  null,
  "up",
  null,
  "left",
  "center",
  "right",
  null,
  "down",
  null,
] as const satisfies readonly (DirectionIntent | "center" | null)[];

const armByIntent = Object.fromEntries(DPAD_ARMS.map((arm) => [arm.intent, arm])) as Record<
  DirectionIntent,
  (typeof DPAD_ARMS)[number]
>;

function useIntentPress(intent: Intent) {
  const { pressDown, pressUp } = useEmulator();

  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressDown(intent);
  };

  const onPointerUp = () => pressUp(intent);

  const onClick = (e: MouseEvent) => {
    if (e.detail === 0) pressDown(intent);
  };

  return { onPointerDown, onPointerUp, onPointerCancel: onPointerUp, onClick };
}

function DpadArm({
  Icon,
  label,
  pressed,
  intent,
}: {
  Icon: LucideIcon;
  label: string;
  pressed?: boolean;
  intent: DirectionIntent;
}) {
  const press = useIntentPress(intent);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            onMouseDown={dropFocus}
            {...press}
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
  pressedIntents,
}: {
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
        {DPAD_GRID.map((cell, i) => {
          if (cell === null) return <div key={i} />;
          if (cell === "center") return <div key={i} aria-hidden className="size-8" />;
          const { Icon, label, intent } = armByIntent[cell];
          return (
            <DpadArm
              key={cell}
              Icon={Icon}
              label={label}
              intent={intent}
              pressed={pressedIntents.has(intent)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  intent,
  pressed,
  disabled,
  children,
}: {
  label: string;
  intent: Intent;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const press = useIntentPress(intent);

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
            {...press}
            className={cn("hover:bg-accent/60 active:bg-accent", pressed && "bg-accent")}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// gesture controls; emits intents to the shell.
export function Dpad() {
  const { pressedIntents } = useEmulator();

  return (
    <TooltipProvider delay={1000}>
      <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-muted p-2 shadow-md">
        <ControlButton label="Back (Middle pinch)" intent="back" pressed={pressedIntents.has("back")}>
          <Undo2 />
        </ControlButton>

        <DpadCross pressedIntents={pressedIntents} />

        <ControlButton
          label="Select (Index pinch)"
          intent="select"
          pressed={pressedIntents.has("select")}
        >
          <MousePointer2 className="-scale-x-100" fill="currentColor" />
        </ControlButton>
      </div>
    </TooltipProvider>
  );
}
