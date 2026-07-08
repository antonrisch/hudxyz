"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { SIMULATOR_SUMMARY, FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { legal } from "@/lib/legal/config";
import { useSimulatorState } from "@/components/simulator";

function LegalLinks() {
  return (
    <>
      <a
        href={`mailto:${legal.contactEmail}`}
        className="text-foreground hover:underline underline-offset-4"
      >
        Contact
      </a>
      {" · "}
      <a href={FEEDBACK_MAILTO} className="text-foreground hover:underline underline-offset-4">
        Feedback
      </a>
      {" · "}
      <Link href="/privacy" className="text-foreground hover:underline underline-offset-4">
        Privacy
      </Link>
      {" · "}
      <Link href="/terms" className="text-foreground hover:underline underline-offset-4">
        Terms
      </Link>
    </>
  );
}

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
          <p className="text-[10px] text-pretty leading-tight text-muted-foreground">{SIMULATOR_SUMMARY}</p>
          <p className="text-[10px]">
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
