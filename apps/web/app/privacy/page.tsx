import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — hud.xyz",
  description: "How hud.xyz collects, uses, and discloses personal information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <PrivacyContent />
    </LegalPage>
  );
}
