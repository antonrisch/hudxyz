"use client";

import Link from "next/link";
import { SIMULATOR_SUMMARY, FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { legal } from "@/lib/legal/config";
import { MobileOnly } from "@/components/simulator/mobile-only";

export function AppLegalLinks() {
  return (
    <>
      <a
        href={`mailto:${legal.contactEmail}`}
        className="text-foreground hover:underline underline-offset-4"
      >
        Contact
      </a>
      {" · "}
      <a href={FEEDBACK_MAILTO} className="text-foreground hover:underline underline-offset-4">
        Feedback
      </a>
      {" · "}
      <Link href="/privacy" className="text-foreground hover:underline underline-offset-4">
        Privacy
      </Link>
      {" · "}
      <Link href="/terms" className="text-foreground hover:underline underline-offset-4">
        Terms
      </Link>
    </>
  );
}

export function MobileAppFooter() {
  return (
    <MobileOnly>
      <footer className="shrink-0 p-3">
        <p className="text-xs text-pretty leading-snug text-muted-foreground">
          {SIMULATOR_SUMMARY}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <AppLegalLinks />
        </p>
      </footer>
    </MobileOnly>
  );
}
