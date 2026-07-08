"use client";

import { useId, type MouseEvent, type PointerEvent } from "react";
import {
  ArrowBigUp,
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  type LucideIcon,
  Pointer,
} from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { useSimulator } from "@/components/simulator";
import type { Intent } from "@/lib/simulator/store";
import { dropFocus } from "@/lib/simulator/input";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type IconButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

const dpadCell =
  "touch-manipulation rounded-lg border-0 bg-transparent bg-clip-border text-primary-foreground shadow-none hover:bg-primary-hover hover:text-primary-foreground active:bg-primary-active active:text-primary-foreground aria-pressed:bg-primary-pressed aria-pressed:text-primary-foreground";

const selectCell =
  "self-center justify-self-center rounded-lg bg-brand text-brand-foreground hover:bg-brand-hover hover:text-brand-foreground active:bg-brand-active active:text-brand-foreground aria-pressed:bg-brand-pressed aria-pressed:text-brand-foreground";

// Single path in 0–96 space; scales with the shell via viewBox / objectBoundingBox clip.
const DPAD_CLIP_UNITS = 96;
const DPAD_CROSS_PATH =
  "M40 0H56Q64 0 64 8V26Q64 32 70 32H88Q96 32 96 40V56Q96 64 88 64H70Q64 64 64 70V88Q64 96 56 96H40Q32 96 32 88V70Q32 64 26 64H8Q0 64 0 56V40Q0 32 8 32H26Q32 32 32 26V8Q32 0 40 0Z";

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
  iconSize,
  selectSizeClass,
}: {
  intent: Intent;
  Icon: LucideIcon;
  label: string;
  pressed?: boolean;
  placement: string;
  iconSize: IconButtonSize;
  selectSizeClass: string;
}) {
  const press = useIntentPress(intent);

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconSize}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={dropFocus}
      {...press}
      className={cn(
        dpadCell,
        intent === "select" ? cn(selectCell, selectSizeClass) : null,
        placement,
      )}
    >
      <Icon />
    </Button>
  );
}

export function Dpad({ pressedIntents }: { pressedIntents: ReadonlySet<Intent> }) {
  const clipPathId = useId();
  const isMobile = useMobileLayout();
  const iconSize: IconButtonSize = isMobile ? "icon-lg" : "icon";
  const shellSize = isMobile ? "size-[7.5rem]" : "size-24";
  const selectSizeClass = isMobile ? "size-9" : "size-7";

  return (
    <div className={cn("relative shrink-0", shellSize)}>
      <svg aria-hidden className="absolute size-0 overflow-hidden">
        <defs>
          <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
            <path d={DPAD_CROSS_PATH} transform={`scale(${1 / DPAD_CLIP_UNITS})`} />
          </clipPath>
        </defs>
      </svg>
      <svg
        aria-hidden
        viewBox="-1 -1 98 98"
        overflow="visible"
        className="pointer-events-none absolute -inset-px size-[calc(100%+2px)]"
      >
        <path
          d={DPAD_CROSS_PATH}
          className="fill-primary stroke-primary"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute inset-0 grid grid-cols-3 grid-rows-3"
        style={{ clipPath: `url(#${clipPathId})` }}
      >
        {DPAD_CELLS.map((cell) => (
          <CrossCell
            key={cell.intent}
            intent={cell.intent}
            Icon={cell.Icon}
            label={cell.label}
            placement={cell.placement}
            pressed={pressedIntents.has(cell.intent)}
            iconSize={iconSize}
            selectSizeClass={selectSizeClass}
          />
        ))}
      </div>
    </div>
  );
}
