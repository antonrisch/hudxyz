"use client";

import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dpad, useIntentPress } from "@/components/simulator/toolbar/dpad";
import { ScreenshotButton } from "@/components/simulator/toolbar/screenshot-button";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { ToolbarPlacementButton } from "@/components/simulator/toolbar/toolbar-placement-button";
import { DesktopOnly } from "@/components/simulator/mobile-only";
import { useSimulator } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";

const toolbarShell = cva(
  "pointer-events-auto flex w-full items-center justify-between gap-2 sm:justify-center sm:gap-4",
  {
    variants: {
      variant: {
        floaty: "rounded-2xl bg-background p-1 pr-2 shadow-lg sm:w-max sm:shrink-0",
        sidebar: "py-2",
      },
    },
    defaultVariants: {
      variant: "floaty",
    },
  },
);

export type ToolbarVariant = NonNullable<VariantProps<typeof toolbarShell>["variant"]>;

// gesture bar; emits intents to the shell. variant controls chrome only.
export function Toolbar({
  variant = "floaty",
  endAction,
}: {
  variant?: ToolbarVariant;
  endAction?: ReactNode;
}) {
  const { pressedIntents } = useSimulator();
  const press = useIntentPress("back");

  return (
    <div className={toolbarShell({ variant })}>
      <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border bg-muted p-0.5">
        <ScreenRecordButton />
        <ScreenshotButton />
        <DesktopOnly>
          <ToolbarPlacementButton />
        </DesktopOnly>
      </div>

      <Dpad pressedIntents={pressedIntents} />

      <Button
        variant="default"
        size="icon"
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
