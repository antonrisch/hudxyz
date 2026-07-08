"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dpad, useIntentPress } from "@/components/simulator/toolbar/dpad";
import { ScreenshotButton } from "@/components/simulator/toolbar/screenshot-button";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { useSimulator } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { Undo2 } from "lucide-react";

// floating gesture bar over the stage; emits intents to the shell.
export function Toolbar({ endAction }: { endAction?: ReactNode }) {
  const { pressedIntents } = useSimulator();
  const press = useIntentPress("back");

  return (
    <div className="pointer-events-auto flex w-full items-center justify-between gap-2 rounded-2xl bg-background p-2 shadow-lg sm:w-max sm:shrink-0 sm:justify-center sm:gap-4">
      <div className="flex flex-col gap-0.5 items-center justify-center bg-muted rounded-xl p-0.5 border">
        <ScreenshotButton />
        <ScreenRecordButton />
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
