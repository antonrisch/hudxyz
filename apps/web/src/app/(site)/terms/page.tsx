import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TermsContent } from "@/components/legal/terms-content";
import { legal } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of the hudxyz.com Meta Ray-Ban Display simulator, Hub Directory, and hub submission flow.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={legal.termsLastUpdated}>
      <TermsContent />
    </LegalPage>
  );
}
