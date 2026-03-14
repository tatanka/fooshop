import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacyContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy | Fooshop",
  description:
    "Privacy Policy for Fooshop. How we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return <LegalPage content={privacyContent} />;
}
