"use client";

import type { MouseEvent } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmulator, useEmulatorState } from "@/components/emulator";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export function ScreenshotButton() {
  const { captureDisplay } = useEmulator();
  const canCapture = useEmulatorState((s) => s.screen === "app" && s.status === "ready");

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      aria-label="Screenshot"
      onMouseDown={dropFocus}
      onClick={() => canCapture && void captureDisplay()}
      className="shrink-0 max-md:size-9 max-md:px-0 border-border!"
    >
      <Camera />
      <span className="hidden md:inline">Screenshot</span>
    </Button>
  );
}
