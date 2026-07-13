"use client";

import { useState } from "react";

import { HudGlobalBanner } from "@/components/layout/global-banner";
import { Button } from "@/components/ui/button";

export function GlobalBannerDevPreview() {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Show banner
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Hide
        </Button>
        <p className="text-xs text-muted-foreground">
          Fixed bottom-right. Non-modal — page stays interactive.
        </p>
      </div>
      <HudGlobalBanner open={open} onOpenChange={setOpen} />
    </div>
  );
}
