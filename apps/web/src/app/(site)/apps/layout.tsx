import { AppFooter } from "@/components/layout/app-footer";

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <AppFooter />
    </div>
  );
}
