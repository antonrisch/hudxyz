"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulatorState } from "@/components/simulator";
import { dropFocus } from "@/lib/simulator/input";
import { buildSimulatorShareUrl, normalizeWebUrl } from "@/lib/simulator/search-params";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ShareMenu({ className }: { className?: string }) {
  const url = useSimulatorState((s) => s.url);

  const copyLink = () => {
    const appUrl = normalizeWebUrl(url);
    void navigator.clipboard.writeText(buildSimulatorShareUrl(appUrl || undefined));
    toast.message("Link copied");
  };

  return (
    <Button
      type="button"
      size="lg"
      aria-label="Share"
      onMouseDown={dropFocus}
      onClick={copyLink}
      className={cn("shrink-0 max-sm:size-10 max-sm:px-0", className)}
    >
      <Share2 className="sm:hidden inline" />
      <span className="sm:inline hidden">Share</span>
    </Button>
  );
}
