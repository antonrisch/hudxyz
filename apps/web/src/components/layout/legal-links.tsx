import Link from "next/link";

import { FEEDBACK_MAILTO } from "@/lib/simulator/config";
import { legal } from "@/lib/legal/config";

/** Shared contact / privacy / terms links (simulator footer, legal pages, directory). */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <span className={className}>
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
    </span>
  );
}
