"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { buildSimulatorShareUrl, normalizeWebUrl } from "@/lib/simulator/search-params";
import { toast } from "sonner";

export function ShareMenu() {
  const url = useSimulatorState((s) => s.url);

  const copyLink = () => {
    const appUrl = normalizeWebUrl(url);
    void navigator.clipboard.writeText(buildSimulatorShareUrl(appUrl || undefined));
    toast.message("Link copied");
  };

  return (
    <Button type="button" size="lg" aria-label="Share" onMouseDown={dropFocus} onClick={copyLink}>
      <Share2 className="sm:hidden inline" />
      <span className="sm:inline hidden">Share</span>
    </Button>
  );
}
