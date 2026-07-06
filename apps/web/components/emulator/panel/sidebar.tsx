"use client";

import Link from "next/link";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DisplayPanel } from "@/components/emulator/panel/controls";
import { ViewSwitcher } from "@/components/emulator/panel/view-switcher";
import { ZoomControls } from "@/components/emulator/panel/zoom-controls";
import { EMULATOR_SUMMARY, EMULATOR_TITLE, FEEDBACK_MAILTO } from "@/lib/emulator/config";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { dropFocus } from "@/lib/emulator/input";
import { cn } from "@/lib/utils";

function DisplaySidebarIntro() {
  return (
    <h1 className="shrink-0 p-3 pb-2 text-sm leading-snug font-semibold">{EMULATOR_TITLE}</h1>
  );
}

function DisplaySidebarFooter() {
  return (
    <footer className="mt-auto shrink-0">
      <Separator />
      <div className="p-3">
        <p className="text-xs text-pretty text-muted-foreground">
          {EMULATOR_SUMMARY}
          <br />
          <a
            href={FEEDBACK_MAILTO}
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            Contact
          </a>
          {" · "}
          <Link
            href="/privacy"
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}

function DisplayPanelControlsShell() {
  return (
    <>
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
          <ViewSwitcher />
          <ZoomControls />
        </div>
        <Separator />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DisplayPanel />
      </div>
    </>
  );
}

// intro + controls + footer; `contents` on mobile (grid rows), flex column on sm+.
export function DisplaySidebarColumn() {
  const open = useEmulatorState((s) => s.displayPanelOpen);

  return (
    <div
      className={cn(
        "contents sm:flex sm:col-start-2 sm:row-start-1 sm:min-h-0 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:bg-background",
      )}
    >
      <header className="row-start-1 shrink-0 rounded-2xl border bg-background sm:rounded-none sm:border-0 sm:bg-transparent">
        <DisplaySidebarIntro />
      </header>

      {open ? (
        <aside className="hidden min-h-0 flex-1 flex-col overflow-hidden sm:flex">
          <DisplayPanelControlsShell />
        </aside>
      ) : null}

      <div className="row-start-3 shrink-0 rounded-2xl bg-background sm:mt-auto sm:rounded-none sm:bg-transparent">
        <DisplaySidebarFooter />
      </div>
    </div>
  );
}

export function DisplayPanelTrigger() {
  const { store } = useEmulator();
  const open = useEmulatorState((s) => s.displayPanelOpen);

  return (
    <>
      <Sheet>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              aria-label="Display settings"
              onMouseDown={dropFocus}
              className="size-10 px-0 sm:hidden"
            >
              <PanelRight />
            </Button>
          }
        />
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{EMULATOR_TITLE}</SheetTitle>
            <SheetDescription>{EMULATOR_SUMMARY}</SheetDescription>
          </SheetHeader>
          <DisplayPanelControlsShell />
        </SheetContent>
      </Sheet>

      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label={open ? "Hide display panel" : "Show display panel"}
        aria-pressed={open}
        onMouseDown={dropFocus}
        onClick={() => store.getState().toggleDisplayPanel()}
        className={cn("hidden size-10 px-0 sm:inline-flex", open && "bg-muted")}
      >
        <PanelRight />
      </Button>
    </>
  );
}
