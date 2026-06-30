"use client";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { UrlBar } from "@/components/emulator/url-bar";
import { ViewSwitcher } from "@/components/emulator/view-switcher";
import { ScreenshotButton } from "@/components/emulator/screenshot-button";
import { ZoomControls } from "@/components/emulator/zoom-controls";

// emulator toolbar: logo left, url bar + view/zoom center, share right.
// 1fr/auto/1fr grid keeps the center group on the header's true horizontal
// center even when logo and share differ in width.
// view switcher and zoom hide below md — they'll move to a sidebar later.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2">
        <Logo className="justify-self-start" />
        <div className="flex min-w-0 max-w-[calc(100vw-12rem)] items-center gap-2">
          <UrlBar />
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <ViewSwitcher />
            <ZoomControls />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <ScreenshotButton />
          <Button
            size="lg"
            onClick={() => void navigator.clipboard.writeText(window.location.href)}
          >
            Share
          </Button>
        </div>
      </div>
    </header>
  );
}
