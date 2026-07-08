"use client";

import type { ReactNode } from "react";
import { PanelHeader } from "@/components/simulator/panel/header";
import { PanelContent } from "@/components/simulator/panel/controls";
import { DesktopOnlyCallout } from "@/components/simulator/panel/desktop-only-callout";
import { PanelFooter } from "@/components/simulator/panel/footer";

export function Panel({
  footer,
  showSummary = false,
  headerClassName,
  hideFooter = false,
  showDesktopOnlyCallout = false,
}: {
  footer?: ReactNode;
  showSummary?: boolean;
  headerClassName?: string;
  hideFooter?: boolean;
  showDesktopOnlyCallout?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PanelHeader className={headerClassName} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelContent />
        {showDesktopOnlyCallout ? <DesktopOnlyCallout /> : null}
      </div>
      {!hideFooter ? (
        <PanelFooter showSummary={showSummary} footer={footer} dockToolbar />
      ) : null}
    </div>
  );
}
