import { AppFooter } from "@/components/layout/app-footer";

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppFooter />
    </>
  );
}
