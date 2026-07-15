"use client";

import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { OpenOnGlasses } from "@/components/simulator/header/open-on-glasses";
import { UrlBar } from "@/components/simulator/header/url-bar";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { PanelToggle } from "@/components/simulator/panel/sidebar";
import { DesktopOnly } from "@/components/simulator/mobile-only";
import { buttonVariants } from "@/components/ui/button";
import type { SuggestedApp } from "@/lib/simulator/config";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

/** Simulator toolbar: logo + url bar + record/open-on-glasses (+ desktop display panel toggle). */
export function SimulatorHeader({ suggestedApps }: { suggestedApps: SuggestedApp[] }) {
  return (
    <header aria-label="Simulator toolbar" className="z-50 shrink-0">
      <div className="page-px grid h-(--header-h) grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex items-center gap-5 justify-self-start">
          <Logo />
          <nav className="hidden items-center sm:flex">
            <Link href="/apps" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              <LayoutGrid
                fill="currentColor"
                data-icon="inline-start"
                className="text-brand-dark"
              />
              Apps
            </Link>
          </nav>
        </div>
        <UrlBar
          className="min-w-0 w-full max-w-full sm:max-w-96 sm:justify-self-center"
          suggestedApps={suggestedApps}
        />
        <div className="flex items-center gap-2 justify-self-end">
          <DesktopOnly>
            <ScreenRecordButton size="lg" showLabel className="shrink-0" />
          </DesktopOnly>
          <OpenOnGlasses suggestedApps={suggestedApps} />
          <DesktopOnly>
            <PanelToggle />
          </DesktopOnly>
        </div>
      </div>
    </header>
  );
}
