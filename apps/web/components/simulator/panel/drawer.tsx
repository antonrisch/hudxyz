"use client";

import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SIMULATOR_SUMMARY, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { dropFocus } from "@/lib/simulator/input";

export function PanelDrawer({ children }: { children: ReactNode }) {
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Display settings"
            onMouseDown={dropFocus}
            className="shrink-0"
          >
            <Settings />
          </Button>
        }
      />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{SIMULATOR_TITLE}</DrawerTitle>
          <DrawerDescription className="sr-only">{SIMULATOR_SUMMARY}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-8 z-10 h-8 bg-linear-to-t from-popover to-transparent"
          />
          <DrawerFooter className="pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerClose
              render={
                <Button
                  type="button"
                  size="lg"
                  className="w-full rounded-full"
                  onMouseDown={dropFocus}
                />
              }
            >
              Close
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
