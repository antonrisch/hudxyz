"use client";

import type { MouseEvent, PointerEvent } from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  type LucideIcon,
  Pointer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulator } from "@/components/simulator";
import type { Intent } from "@/lib/simulator/store";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

const dpadCell =
  "touch-manipulation rounded-lg border-0 bg-transparent bg-clip-border text-primary-foreground shadow-none hover:bg-primary-hover hover:text-primary-foreground active:bg-primary-active active:text-primary-foreground aria-pressed:bg-primary-pressed aria-pressed:text-primary-foreground";

const selectCell =
  "size-7 self-center justify-self-center bg-brand text-brand-foreground hover:bg-brand-hover hover:text-brand-foreground active:bg-brand-active active:text-brand-foreground aria-pressed:bg-brand-pressed aria-pressed:text-brand-foreground";

// const selectCell =
//   "size-7 self-center justify-self-center bg-primary-foreground text-primary hover:bg-[color-mix(in_oklch,var(--primary-foreground)_88%,var(--primary)_12%)] hover:text-primary active:bg-[color-mix(in_oklch,var(--primary-foreground)_80%,var(--primary)_20%)] active:text-primary aria-pressed:bg-[color-mix(in_oklch,var(--primary-foreground)_72%,var(--primary)_28%)] aria-pressed:text-primary";

const dpadCrossPath =
  "M40 0H56Q64 0 64 8V26Q64 32 70 32H88Q96 32 96 40V56Q96 64 88 64H70Q64 64 64 70V88Q64 96 56 96H40Q32 96 32 88V70Q32 64 26 64H8Q0 64 0 56V40Q0 32 8 32H26Q32 32 32 26V8Q32 0 40 0Z";

const dpadCrossClip = `path("${dpadCrossPath}")`;

const DPAD_CELLS = [
  {
    intent: "up" as const,
    Icon: ArrowBigUp,
    label: "Swipe up",
    placement: "col-start-2 row-start-1",
  },
  {
    intent: "left" as const,
    Icon: ArrowBigLeft,
    label: "Swipe left",
    placement: "col-start-1 row-start-2",
  },
  {
    intent: "select" as const,
    Icon: Pointer,
    label: "Enter",
    placement: "col-start-2 row-start-2",
  },
  {
    intent: "right" as const,
    Icon: ArrowBigRight,
    label: "Swipe right",
    placement: "col-start-3 row-start-2",
  },
  {
    intent: "down" as const,
    Icon: ArrowBigDown,
    label: "Swipe down",
    placement: "col-start-2 row-start-3",
  },
] as const;

export function useIntentPress(intent: Intent) {
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={dropFocus}
      {...press}
      className={cn(dpadCell, intent === "select" ? selectCell : null, placement)}
    >
      <Icon />
    </Button>
  );
}

export function Dpad({ pressedIntents }: { pressedIntents: ReadonlySet<Intent> }) {
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
          className="fill-primary stroke-primary"
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
