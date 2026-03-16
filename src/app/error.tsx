"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-up">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-muted">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <button
            onClick={reset}
            className="bg-accent text-white px-8 py-4 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-border text-ink px-8 py-4 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
