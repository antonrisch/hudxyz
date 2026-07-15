import type { Metadata } from "next";
import Link from "next/link";

import { PadmeNav } from "@/components/padme/nav";
import { requirePadmeAccess } from "@/lib/padme/access";

export const metadata: Metadata = {
  title: "Padme",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PadmeLayout({ children }: { children: React.ReactNode }) {
  await requirePadmeAccess();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="page-px mx-auto flex h-14 w-full max-w-3xl items-center gap-6">
          <Link href="/padme" className="text-sm text-muted-foreground hover:text-foreground">
            Padme
          </Link>
          <PadmeNav />
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
