export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface Props {
  searchParams: Promise<{ port?: string }>;
}

export default async function CliAuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const port = params.port;

  // Validate port parameter
  const portNum = port ? parseInt(port, 10) : NaN;
  if (!port || isNaN(portNum) || portNum < 1024 || portNum > 65535) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h1>
          <p className="text-gray-600">Missing or invalid port parameter. Please run <code className="bg-gray-100 px-2 py-1 rounded">fooshop login</code> again.</p>
        </div>
      </main>
    );
  }

  // Check session
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/cli-auth?port=${port}`)}`);
  }

  // Generate CSRF nonce
  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("cli-auth-nonce", nonce, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60,
    path: "/api/auth/cli-callback",
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            fooshop
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          CLI wants to access your account
        </h2>

        <p className="text-gray-600 mb-6">
          {session.user.name && <span>{session.user.name}<br /></span>}
          Signed in as <strong>{session.user.email}</strong>
        </p>

        <p className="text-sm text-gray-500 mb-8">
          This will create an API key with full access to your store, products, orders, and analytics.
        </p>

        <form method="POST" action="/api/auth/cli-callback">
          <input type="hidden" name="port" value={port} />
          <input type="hidden" name="nonce" value={nonce} />

          <button
            type="submit"
            className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3"
          >
            Approve
          </button>
        </form>

        <a
          href={`http://127.0.0.1:${port}/callback?error=denied`}
          className="block w-full text-center py-3 px-6 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Deny
        </a>
      </div>
    </main>
  );
}
