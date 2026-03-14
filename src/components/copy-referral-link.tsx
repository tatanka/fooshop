"use client";

import { useState } from "react";

interface CopyReferralLinkProps {
  url: string;
}

export function CopyReferralLink({ url }: CopyReferralLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-muted hover:text-ink transition-colors underline"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
