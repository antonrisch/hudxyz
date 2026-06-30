"use client";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { UrlBar } from "@/components/emulator/url-bar";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ZoomControls } from "@/components/emulator/zoom-controls";

// emulator toolbar: logo left, controls centered, share right. the 1fr/auto/1fr grid
// keeps the controls centered regardless of the logo width.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3">
        <Logo className="justify-self-start" />
        <div className="flex items-center gap-4">
          <UrlBar />
          <ViewSwitcher />
          <ZoomControls />
        </div>
        <Button
          className="justify-self-end"
          onClick={() => void navigator.clipboard.writeText(window.location.href)}
        >
          Share
        </Button>
      </div>
    </header>
  );
}
