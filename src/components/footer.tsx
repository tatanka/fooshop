import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="hover:text-ink transition-colors"
          >
            Fooshop
          </Link>
          <Link
            href="/legal/terms"
            className="hover:text-ink transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/legal/privacy"
            className="hover:text-ink transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Fooshop</p>
      </div>
    </footer>
  );
}
