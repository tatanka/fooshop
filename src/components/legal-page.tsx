"use client";

import { useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import type { BilingualLegalDocument } from "@/lib/legal-content";

interface LegalPageProps {
  content: BilingualLegalDocument;
}

export function LegalPage({ content }: LegalPageProps) {
  const [language, setLanguage] = useState<"en" | "it">("en");
  const doc = content[language];

  return (
    <article className="max-w-3xl mx-auto px-4 py-16 animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {language === "en" ? "Last updated" : "Ultimo aggiornamento"}:{" "}
            {doc.lastUpdated}
          </p>
        </div>
        <LanguageToggle language={language} onChange={setLanguage} />
      </div>

      {doc.sections.map((section, index) => (
        <section key={index} className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{section.heading}</h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="mb-3 text-muted leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
