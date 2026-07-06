"use client";

import Link from "next/link";
import { PanelRight, SlidersHorizontal } from "lucide-react";
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
import { DisplayPanel } from "@/components/simulator/panel/controls";
import { ViewSwitcher } from "@/components/simulator/panel/view-switcher";
import { ZoomControls } from "@/components/simulator/panel/zoom-controls";
import { SIMULATOR_SUMMARY, SIMULATOR_TITLE, FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

function LegalLinks() {
  return (
    <>
      <a
        href={FEEDBACK_MAILTO}
        className="hover:text-foreground hover:underline underline-offset-4"
      >
        Contact
      </a>
      {" · "}
      <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-4">
        Privacy
      </Link>
      {" · "}
      <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">
        Terms
      </Link>
    </>
  );
}

function DisplayPanelFooter({ summary }: { summary?: boolean }) {
  if (summary) {
    return (
      <footer className="mt-auto shrink-0">
        <Separator />
        <div className="p-3">
          <p className="text-xs text-pretty text-muted-foreground">
            {SIMULATOR_SUMMARY}
            <br />
            <LegalLinks />
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t p-3">
      <p className="text-xs text-muted-foreground">
        <LegalLinks />
      </p>
    </footer>
  );
}

function DisplayPanelControlsShell({ toolbarClassName }: { toolbarClassName?: string }) {
  return (
    <>
      <div className="shrink-0">
        <div
          className={cn("flex items-center justify-between gap-2 px-3 pb-2.5", toolbarClassName)}
        >
          <ViewSwitcher />
          <ZoomControls className="hidden sm:flex" />
        </div>
        <Separator />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DisplayPanel />
      </div>
    </>
  );
}

// desktop rhs panel — hidden when closed (no width animation; avoids overflow scrollbars).
export function DisplaySidebarColumn() {
  const open = useSimulatorState((s) => s.displayPanelOpen);
  if (!open) return null;

  return (
    <div className="hidden min-h-0 w-72 overflow-hidden rounded-2xl border bg-background sm:col-start-2 sm:row-start-1 sm:flex sm:flex-col">
      <p className="shrink-0 p-3 pb-2 text-sm leading-snug font-semibold">{SIMULATOR_TITLE}</p>
      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DisplayPanelControlsShell />
      </aside>
      <DisplayPanelFooter summary />
    </div>
  );
}

export function DisplayPanelMobileTrigger() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Display settings"
            onMouseDown={dropFocus}
            className="size-10 shrink-0"
          >
            <SlidersHorizontal />
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b p-3 pr-12 pb-2">
          <SheetTitle className="text-sm leading-snug font-semibold">{SIMULATOR_TITLE}</SheetTitle>
          <SheetDescription className="sr-only">{SIMULATOR_SUMMARY}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DisplayPanelControlsShell toolbarClassName="pt-2 pr-12" />
        </div>
        <DisplayPanelFooter />
      </SheetContent>
    </Sheet>
  );
}

export function DisplayPanelTrigger() {
  const { store } = useSimulator();
  const open = useSimulatorState((s) => s.displayPanelOpen);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      aria-label={open ? "Hide display panel" : "Show display panel"}
      aria-pressed={open}
      onMouseDown={dropFocus}
      onClick={() => store.getState().toggleDisplayPanel()}
      className={cn("size-10 px-0", open && "bg-muted")}
    >
      <PanelRight />
    </Button>
  );
}
