"use client";

import type { ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SIMULATOR_SUMMARY, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { dropFocus } from "@/lib/simulator/input";

export function PanelDrawer({ children }: { children: ReactNode }) {
  return (
    <Drawer swipeDirection="right">
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
            <Settings2 />
          </Button>
        }
      />
      <DrawerContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DrawerHeader className="shrink-0 space-y-0 border-b p-3 pb-2">
          <DrawerTitle className="text-sm leading-snug font-semibold">{SIMULATOR_TITLE}</DrawerTitle>
          <DrawerDescription className="sr-only">{SIMULATOR_SUMMARY}</DrawerDescription>
        </DrawerHeader>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
