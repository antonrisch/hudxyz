import { AppHeader } from "@/components/layout/app-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
