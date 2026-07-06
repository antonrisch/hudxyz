"use client";

import type { MouseEvent, PointerEvent, ReactNode } from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  type LucideIcon,
  Pointer,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenshotButton } from "@/components/simulator/input/screenshot-button";
import { useSimulator } from "@/components/simulator";
import type { Intent } from "@/lib/simulator/store";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

const flankClass = "size-10 shrink-0 sm:size-8";

const dpadCell =
  "flex size-8 touch-manipulation items-center justify-center bg-transparent text-primary-foreground outline-none hover:bg-primary-hover active:bg-primary-active aria-pressed:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset";

const dpadCrossPath =
  "M40 0H56Q64 0 64 8V32H88Q96 32 96 40V56Q96 64 88 64H64V88Q64 96 56 96H40Q32 96 32 88V64H8Q0 64 0 56V40Q0 32 8 32H32V8Q32 0 40 0Z";

const dpadCrossClip = `path("${dpadCrossPath}")`;

const DPAD_CELLS = [
  { intent: "up" as const, Icon: ArrowBigUp, label: "Swipe up", placement: "col-start-2 row-start-1" },
  { intent: "left" as const, Icon: ArrowBigLeft, label: "Swipe left", placement: "col-start-1 row-start-2" },
  { intent: "select" as const, Icon: Pointer, label: "Enter", placement: "col-start-2 row-start-2" },
  { intent: "right" as const, Icon: ArrowBigRight, label: "Swipe right", placement: "col-start-3 row-start-2" },
  { intent: "down" as const, Icon: ArrowBigDown, label: "Swipe down", placement: "col-start-2 row-start-3" },
] as const;

function useIntentPress(intent: Intent) {
  const { pressDown, pressUp } = useSimulator();

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

function CrossCell({
  intent,
  Icon,
  label,
  pressed,
  placement,
}: {
  intent: Intent;
  Icon: LucideIcon;
  label: string;
  pressed?: boolean;
  placement: string;
}) {
  const press = useIntentPress(intent);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={dropFocus}
      {...press}
      className={cn(dpadCell, placement)}
    >
      <Icon className="size-4 shrink-0" />
    </button>
  );
}

function DpadCross({ pressedIntents }: { pressedIntents: ReadonlySet<Intent> }) {
  return (
    <div className="relative size-24 shrink-0">
      <svg
        aria-hidden
        viewBox="-1 -1 98 98"
        overflow="visible"
        className="pointer-events-none absolute -inset-px size-[calc(100%+2px)]"
      >
        <path
          d={dpadCrossPath}
          className="stroke-primary"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute inset-0 grid grid-cols-3 grid-rows-3"
        style={{ clipPath: dpadCrossClip }}
      >
        {DPAD_CELLS.map((cell) => (
          <CrossCell
            key={cell.intent}
            intent={cell.intent}
            Icon={cell.Icon}
            label={cell.label}
            placement={cell.placement}
            pressed={pressedIntents.has(cell.intent)}
          />
        ))}
      </div>
    </div>
  );
}

// gesture controls; emits intents to the shell.
export function Dpad({ endAction }: { endAction?: ReactNode }) {
  const { pressedIntents } = useSimulator();
  const press = useIntentPress("back");

  return (
    <div className="pointer-events-auto flex w-full items-center justify-between gap-2 rounded-xl bg-muted px-2 py-1 shadow-lg sm:w-max sm:shrink-0 sm:justify-center sm:gap-4">
      <ScreenshotButton className={flankClass} />

      <DpadCross pressedIntents={pressedIntents} />

      <Button
        variant="default"
        size="icon"
        className={flankClass}
        aria-label="Esc"
        aria-pressed={pressedIntents.has("back")}
        onMouseDown={dropFocus}
        {...press}
      >
        <Undo2 />
      </Button>

      {endAction}
    </div>
  );
}
