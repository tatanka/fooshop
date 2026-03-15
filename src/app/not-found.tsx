import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Fooshop",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-24 text-center animate-fade-up">
        <h1 className="text-8xl font-bold text-muted/40">404</h1>
        <h2 className="mt-4 text-2xl font-bold">This page doesn&apos;t exist</h2>
        <p className="mt-3 text-muted">
          The page you&apos;re looking for may have been moved or no longer
          exists.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/explore"
            className="bg-accent text-white px-8 py-4 rounded-full font-semibold hover:opacity-85 transition-opacity"
          >
            Explore Products
          </Link>
          <Link
            href="/"
            className="border border-border text-ink px-8 py-4 rounded-full font-semibold hover:border-ink transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
