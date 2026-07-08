"use client";

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SIMULATOR_SUMMARY } from "@/lib/simulator/config";
import { AppLegalLinks } from "@/components/simulator/app-footer";
import { useSimulatorState } from "@/components/simulator";

export function PanelFooter({
  showSummary = false,
  footer,
  dockToolbar = false,
}: {
  showSummary?: boolean;
  footer?: ReactNode;
  dockToolbar?: boolean;
}) {
  const toolbarPlacement = useSimulatorState((s) => s.toolbarPlacement);
  const docked = dockToolbar && toolbarPlacement === "sidebar" && footer;

  if (docked) {
    return <footer className="mt-auto w-full shrink-0 border-t">{footer}</footer>;
  }

  if (showSummary) {
    return (
      <footer className="mt-auto shrink-0">
        <Separator />
        <div className="flex flex-col gap-1 px-3 py-2">
          <p className="text-[10px] text-pretty leading-tight text-muted-foreground">
            {SIMULATOR_SUMMARY}
          </p>
          <p className="text-[10px]">
            <AppLegalLinks />
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t p-3">
      <p className="text-xs text-muted-foreground">
        <AppLegalLinks />
      </p>
    </footer>
  );
}
