"use client";

import { Logo } from "@/components/layout/logo";
import { UrlBar } from "@/components/simulator/header/url-bar";
import { ShareMenu } from "@/components/simulator/header/share-menu";
import { ScreenRecordButton } from "@/components/simulator/toolbar/screen-record-button";
import { PanelToggle } from "@/components/simulator/panel/sidebar";
import { DesktopOnly } from "@/components/simulator/mobile-only";

// simulator toolbar: logo + url bar + record/share (+ desktop display panel toggle).
export function AppHeader() {
  return (
    <header aria-label="Simulator toolbar" className="z-50 shrink-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-2">
        <Logo className="justify-self-start" />
        <UrlBar className="min-w-0 w-full max-w-full sm:max-w-96 sm:justify-self-center" />
        <div className="flex items-center gap-2 justify-self-end">
          <DesktopOnly>
            <ScreenRecordButton size="lg" showLabel className="shrink-0" />
          </DesktopOnly>
          <ShareMenu />
          <DesktopOnly>
            <PanelToggle />
          </DesktopOnly>
        </div>
      </div>
    </header>
  );
}
