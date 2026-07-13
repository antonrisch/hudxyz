import type { Metadata } from "next";

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
        <div className="page-px mx-auto flex h-14 w-full max-w-3xl items-center">
          <p className="text-sm text-muted-foreground">Padme (hudxyz.com admin)</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
