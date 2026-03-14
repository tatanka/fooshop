import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { termsContent } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service | Fooshop",
  description:
    "Terms of Service for Fooshop, the AI-powered marketplace for digital products.",
};

export default function TermsPage() {
  return <LegalPage content={termsContent} />;
}
