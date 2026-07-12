"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.message("Link copied");
        window.setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        toast.error("Could not copy link");
        return false;
      }
    },
    [resetMs],
  );

  const resetCopied = useCallback(() => setCopied(false), []);

  return { copied, copy, resetCopied };
}
