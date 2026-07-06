"use client";

import { Logo } from "@/components/layout/logo";
import { UrlBar } from "@/components/emulator/url-bar";
import { FeedbackButton } from "@/components/emulator/feedback-button";
import { ShareMenu } from "@/components/emulator/share-menu";
import { DisplayPanelTrigger } from "@/components/emulator/display-sidebar";

// emulator toolbar: logo left, url bar center, display + share right.
// view / zoom / additive live in the rhs display panel (sheet below sm).
export function AppHeader() {
  return (
    <header className="z-50 shrink-0 bg-background">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2">
        <Logo className="justify-self-start" />
        <div className="flex min-w-0 max-w-[calc(100vw-12rem)] items-center gap-2">
          <UrlBar />
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <DisplayPanelTrigger />
          <FeedbackButton />
          <ShareMenu />
        </div>
      </div>
    </header>
  );
}
