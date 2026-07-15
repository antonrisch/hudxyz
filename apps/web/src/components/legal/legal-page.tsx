import Link from "next/link";

import { legal } from "@/lib/legal/config";
import { cn } from "@/lib/utils";

export function LegalPage({
  title,
  lastUpdated,
  children,
  className,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("page-px mx-auto w-full max-w-3xl flex-1 py-10", className)}>
      <p className="text-muted-foreground text-sm">
        Last updated {lastUpdated} ·{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms
        </Link>
      </p>

      <h1 className="mt-4 font-bold text-3xl tracking-tight">{title}</h1>

      <div className="mt-8 space-y-4 text-base/relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-xl [&_li]:ml-4 [&_p+p]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>

      <p className="text-muted-foreground mt-12 border-t border-border pt-8 text-sm">
        Questions?{" "}
        <a href={`mailto:${legal.contactEmail}`} className="underline underline-offset-4">
          {legal.contactEmail}
        </a>
      </p>
    </main>
  );
}
