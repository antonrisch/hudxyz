"use client";

import { SIMULATOR_SUMMARY } from "@/lib/simulator/config";
import { LegalLinks } from "@/components/layout/legal-links";
import { MobileOnly } from "@/components/simulator/mobile-only";

export function MobileFooter() {
  return (
    <MobileOnly>
      <footer className="shrink-0 p-3">
        <p className="text-xs text-pretty leading-snug text-muted-foreground">
          {SIMULATOR_SUMMARY}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <LegalLinks />
        </p>
      </footer>
    </MobileOnly>
  );
}
