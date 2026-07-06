"use client";

import { Logo } from "@/components/layout/logo";
import { UrlBar } from "@/components/emulator/header/url-bar";
import { FeedbackButton } from "@/components/emulator/header/feedback-button";
import { ShareMenu } from "@/components/emulator/header/share-menu";
import { DisplayPanelTrigger } from "@/components/emulator/panel/sidebar";

// emulator toolbar: logo left, url bar center, display + share right.
export function AppHeader() {
  return (
    <header className="z-50 shrink-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2">
        <Logo className="justify-self-start" />
        <UrlBar className="max-w-[calc(100vw-12rem)]" />
        <div className="flex items-center gap-2 justify-self-end">
          <DisplayPanelTrigger />
          <FeedbackButton />
          <ShareMenu />
        </div>
      </div>
    </header>
  );
}
