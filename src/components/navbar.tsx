import { auth, signIn, signOut } from "@/lib/auth";
import Link from "next/link";

export async function Navbar() {
  const session = await auth();
  const initials = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm bg-paper/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold italic text-ink"
        >
          fooshop.
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/explore"
            className="text-sm font-medium text-muted hover:text-ink transition-colors relative after:absolute after:bottom-[-2px] after:left-1/2 after:w-0 after:h-[1.5px] after:bg-accent after:transition-all after:duration-200 hover:after:left-0 hover:after:w-full"
          >
            Explore
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted hover:text-ink transition-colors relative after:absolute after:bottom-[-2px] after:left-1/2 after:w-0 after:h-[1.5px] after:bg-accent after:transition-all after:duration-200 hover:after:left-0 hover:after:w-full"
              >
                Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center hover:bg-accent transition-colors"
                  title="Sign out"
                >
                  {initials}
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium border border-border px-4 py-1.5 rounded-full hover:bg-ink hover:text-white hover:border-ink transition-colors"
              >
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
