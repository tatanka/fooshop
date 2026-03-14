"use client";

type Language = "en" | "it";

interface LanguageToggleProps {
  language: Language;
  onChange: (lang: Language) => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div role="group" aria-label="Language" className="flex rounded-full border border-border overflow-hidden text-sm">
      <button
        onClick={() => onChange("en")}
        aria-pressed={language === "en"}
        className={`px-3 py-1 font-medium transition-colors ${
          language === "en"
            ? "bg-ink text-white"
            : "bg-surface text-muted hover:text-ink"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange("it")}
        aria-pressed={language === "it"}
        className={`px-3 py-1 font-medium transition-colors ${
          language === "it"
            ? "bg-ink text-white"
            : "bg-surface text-muted hover:text-ink"
        }`}
      >
        IT
      </button>
    </div>
  );
}
