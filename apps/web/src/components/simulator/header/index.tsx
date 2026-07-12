"use client";

import { Logo } from "@/components/layout/logo";
import { OpenOnGlasses } from "@/components/simulator/header/open-on-glasses";
import { UrlBar } from "@/components/simulator/header/url-bar";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { PanelToggle } from "@/components/simulator/panel/sidebar";
import { DesktopOnly } from "@/components/simulator/mobile-only";

/** Simulator toolbar: logo + url bar + record/open-on-glasses (+ desktop display panel toggle). */
export function SimulatorHeader() {
  return (
    <header aria-label="Simulator toolbar" className="z-50 shrink-0">
      <div className="page-px grid h-(--header-h) grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Logo className="justify-self-start" />
        <UrlBar className="min-w-0 w-full max-w-full sm:max-w-96 sm:justify-self-center" />
        <div className="flex items-center gap-2 justify-self-end">
          <DesktopOnly>
            <ScreenRecordButton size="lg" showLabel className="shrink-0" />
          </DesktopOnly>
          <OpenOnGlasses />
          <DesktopOnly>
            <PanelToggle />
          </DesktopOnly>
        </div>
      </div>
    </header>
  );
}
