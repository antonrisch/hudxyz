"use client";

import type { MouseEvent } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmulatorState } from "@/components/emulator";
import { buildEmulatorShareUrl } from "@/lib/emulator/search-params";
import { normalizeWebUrl } from "@/lib/emulator/normalize-url";
import { toast } from "sonner";

const dropFocus = (e: MouseEvent) => e.preventDefault();

export function ShareMenu() {
  const url = useEmulatorState((s) => s.url);

  const copyLink = () => {
    const appUrl = normalizeWebUrl(url);
    void navigator.clipboard.writeText(buildEmulatorShareUrl(appUrl || undefined));
    toast.message("Link copied");
  };

  return (
    <Button type="button" size="lg" aria-label="Share" onMouseDown={dropFocus} onClick={copyLink}>
      <Share2 className="sm:hidden inline" />
      <span className="sm:inline hidden">Share</span>
    </Button>
  );
}
