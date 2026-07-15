import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { legal } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How hudxyz.com collects, uses, and discloses personal information for the simulator, apps directory, submissions, cookies, and analytics.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={legal.privacyLastUpdated}>
      <PrivacyContent />
    </LegalPage>
  );
}
