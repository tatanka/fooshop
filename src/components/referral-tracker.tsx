"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "fooshop_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    const code = ref.toUpperCase().trim();

    // Save to localStorage with TTL (last-click wins)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, timestamp: Date.now() })
    );

    // Fire click tracking (fire-and-forget)
    fetch(`/api/referrals/track?code=${encodeURIComponent(code)}`).catch(
      () => {}
    );
  }, [searchParams]);

  return null;
}

/** Read the stored referral code, checking TTL. Returns null if expired or absent. */
export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const { code, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return code;
  } catch {
    return null;
  }
}
