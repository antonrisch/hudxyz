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
import { Button, buttonVariants } from "@/components/ui/button";
import { ScreenshotButton } from "@/components/emulator/input/screenshot-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmulator } from "@/components/emulator";
import type { Intent } from "@/lib/emulator/store";
import { dropFocus } from "@/lib/emulator/drop-focus";
import type { VariantProps } from "class-variance-authority";

type DirectionIntent = Extract<Intent, "up" | "down" | "left" | "right">;

const dpadCell =
  "flex size-8 items-center justify-center bg-transparent text-primary-foreground outline-none hover:bg-primary-hover active:bg-primary-active aria-pressed:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset";

const dpadCrossPath =
  "M40 0H56Q64 0 64 8V32H88Q96 32 96 40V56Q96 64 88 64H64V88Q64 96 56 96H40Q32 96 32 88V64H8Q0 64 0 56V40Q0 32 8 32H32V8Q32 0 40 0Z";

const dpadCrossClip = `path("${dpadCrossPath}")`;

const DPAD_ARMS: { intent: DirectionIntent; Icon: LucideIcon; label: string }[] = [
  { intent: "up", Icon: ArrowBigUp, label: "Swipe up" },
  { intent: "left", Icon: ArrowBigLeft, label: "Swipe left" },
  { intent: "right", Icon: ArrowBigRight, label: "Swipe right" },
  { intent: "down", Icon: ArrowBigDown, label: "Swipe down" },
];

const DPAD_GRID = [
  null,
  "up",
  null,
  "left",
  "select",
  "right",
  null,
  "down",
  null,
] as const satisfies readonly (DirectionIntent | "select" | null)[];

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
            className={dpadCell}
          >
            <Icon className="size-4 shrink-0" />
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DpadSelect({ pressed }: { pressed?: boolean }) {
  const press = useIntentPress("select");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Enter"
            aria-pressed={pressed}
            onMouseDown={dropFocus}
            {...press}
            className={dpadCell}
          >
            <Pointer className="size-4 shrink-0" />
          </button>
        }
      />
      <TooltipContent>Enter</TooltipContent>
    </Tooltip>
  );
}

function DpadCross({ pressedIntents }: { pressedIntents: ReadonlySet<Intent> }) {
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
          className="stroke-primary"
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
          if (cell === "select") {
            return <DpadSelect key={cell} pressed={pressedIntents.has("select")} />;
          }
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

function IntentButton({
  label,
  intent,
  pressed,
  children,
  variant = "default",
}: {
  label: string;
  intent: Intent;
  pressed?: boolean;
  children: ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  const press = useIntentPress(intent);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon"
            aria-label={label}
            aria-pressed={pressed}
            onMouseDown={dropFocus}
            {...press}
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
      <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-muted px-2 py-1 shadow-lg">
        <ScreenshotButton />

        <DpadCross pressedIntents={pressedIntents} />

        <IntentButton label="Esc" intent="back" pressed={pressedIntents.has("back")}>
          <Undo2 />
        </IntentButton>
      </div>
    </TooltipProvider>
  );
}
