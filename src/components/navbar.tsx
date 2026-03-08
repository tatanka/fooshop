import { auth, signIn, signOut } from "@/lib/auth";
import Link from "next/link";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          Fooshop
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/explore"
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            Explore
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-black transition-colors"
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
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Sign out
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
                className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
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
