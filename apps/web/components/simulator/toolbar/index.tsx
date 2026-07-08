"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dpad, useIntentPress } from "@/components/simulator/toolbar/dpad";
import { ScreenshotButton } from "@/components/simulator/toolbar/screenshot-button";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { ToolbarPlacementButton } from "@/components/simulator/toolbar/toolbar-placement-button";
import { DesktopOnly, MobileOnly } from "@/components/simulator/mobile-only";
import { Panel } from "@/components/simulator/panel";
import { PanelDrawer } from "@/components/simulator/panel/drawer";
import { ViewToggleButton } from "@/components/simulator/panel/view-switcher";
import { useSimulator } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { useMobileLayout } from "@/lib/use-mobile-layout";

const toolbarShell = cva(
  "pointer-events-auto flex w-full items-center justify-between gap-10 sm:gap-2 justify-center sm:gap-4",
  {
    variants: {
      variant: {
        floaty: "rounded-2xl bg-background sm:p-1 sm:pr-2 sm:shadow-lg sm:w-max sm:shrink-0",
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
export function Toolbar({ variant = "floaty" }: { variant?: ToolbarVariant }) {
  const { pressedIntents } = useSimulator();
  const isMobile = useMobileLayout();
  const press = useIntentPress("back");

  return (
    <div className={toolbarShell({ variant })}>
      <div className="flex flex-col items-center justify-center gap-0.5 border bg-muted max-sm:rounded-[calc(min(var(--radius-xl),16px)+0.125rem)] max-sm:p-0.5 sm:rounded-xl sm:p-0.5">
        <DesktopOnly>
          <ScreenRecordButton />
          <ScreenshotButton />
        </DesktopOnly>
        <MobileOnly>
          <ViewToggleButton />
          <PanelDrawer>
            <Panel headerClassName="pt-2" hideFooter showDesktopOnlyCallout />
          </PanelDrawer>
        </MobileOnly>
        <DesktopOnly>
          <ToolbarPlacementButton />
        </DesktopOnly>
      </div>

      <Dpad pressedIntents={pressedIntents} />

      <Button
        variant="default"
        size={isMobile ? "icon-lg" : "icon"}
        aria-label="Esc"
        aria-pressed={pressedIntents.has("back")}
        onMouseDown={dropFocus}
        {...press}
        className="mr-1"
      >
        <Undo2 />
      </Button>
    </div>
  );
}
