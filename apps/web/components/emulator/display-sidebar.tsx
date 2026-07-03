"use client";

import type { MouseEvent } from "react";
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
import { DisplayPanel } from "@/components/emulator/display-panel";

const dropFocus = (e: MouseEvent) => e.preventDefault();

// rhs display panel: persistent on lg+, sheet drawer below.
export function DisplaySidebar() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-sidebar-border bg-sidebar lg:flex">
      <DisplayPanel />
    </aside>
  );
}

export function DisplaySheetTrigger() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Display settings"
            onMouseDown={dropFocus}
            className="lg:hidden"
          >
            <PanelRight />
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="sr-only">
          <SheetTitle>Display</SheetTitle>
          <SheetDescription>Preview how the waveguide reads.</SheetDescription>
        </SheetHeader>
        <DisplayPanel />
      </SheetContent>
    </Sheet>
  );
}
