"use client";

import type { ReactNode } from "react";
import { PanelHeader } from "@/components/simulator/panel/header";
import { PanelContent } from "@/components/simulator/panel/controls";
import { PanelFooter } from "@/components/simulator/panel/footer";

export function Panel({
  footer,
  showSummary = false,
  headerClassName,
  hideFooter = false,
}: {
  footer?: ReactNode;
  showSummary?: boolean;
  headerClassName?: string;
  hideFooter?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PanelHeader className={headerClassName} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelContent />
      </div>
      {!hideFooter ? (
        <PanelFooter showSummary={showSummary} footer={footer} dockToolbar />
      ) : null}
    </div>
  );
}
