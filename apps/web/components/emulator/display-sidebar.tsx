"use client";

import type { MouseEvent } from "react";
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
import { DisplayPanel, DisplayPanelHeader } from "@/components/emulator/display-panel";
import { FEEDBACK_MAILTO } from "@/components/emulator/feedback-button";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { cn } from "@/lib/utils";

const dropFocus = (e: MouseEvent) => e.preventDefault();

function DisplaySidebarFooter() {
  return (
    <div className="shrink-0">
      <Separator />
      <nav aria-label="Site" className="p-3 text-xs text-muted-foreground">
        <a
          href={FEEDBACK_MAILTO}
          className="font-medium text-foreground hover:underline underline-offset-4"
        >
          antonhudxyz@gmail.com
        </a>
        {" · "}
        <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-4">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">
          Terms
        </Link>
      </nav>
    </div>
  );
}

// rhs display panel: persistent collapsible on sm+, sheet drawer below.
export function DisplaySidebar() {
  const open = useEmulatorState((s) => s.displayPanelOpen);
  if (!open) return null;

  return (
    <aside className="hidden min-h-0 w-72 shrink-0 flex-col overflow-hidden sm:flex rounded-2xl border bg-sidebar">
      <DisplayPanelHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DisplayPanel />
      </div>
      <DisplaySidebarFooter />
    </aside>
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
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Display</SheetTitle>
            <SheetDescription>Display preview settings</SheetDescription>
          </SheetHeader>
          <DisplayPanelHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DisplayPanel />
          </div>
          <DisplaySidebarFooter />
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
