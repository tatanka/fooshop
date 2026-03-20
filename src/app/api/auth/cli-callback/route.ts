import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateApiKey, CREATOR_SCOPES } from "@/lib/api-key";
import { cookies } from "next/headers";

function generateSlug(email: string): string {
  const prefix = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomUUID().slice(0, 4);
  return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
  // 1. Verify session
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data
  const formData = await req.formData();
  const nonce = formData.get("nonce") as string | null;
  const portStr = formData.get("port") as string | null;

  // 3. Validate CSRF nonce
  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get("cli-auth-nonce")?.value;
  cookieStore.delete("cli-auth-nonce");

  if (!nonce || !cookieNonce || nonce !== cookieNonce) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 403 });
  }

  // 4. Validate port
  const port = portStr ? parseInt(portStr, 10) : NaN;
  if (isNaN(port) || port < 1024 || port > 65535) {
    return NextResponse.json({ error: "Invalid port" }, { status: 400 });
  }

  // 5. Find or create creator
  let creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    const [newCreator] = await db
      .insert(creators)
      .values({
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.email.split("@")[0],
        slug: generateSlug(session.user.email),
      })
      .returning();
    creator = newCreator;
  }

  // 6. Revoke existing CLI key (prevent accumulation)
  await db
    .delete(apiKeys)
    .where(
      and(eq(apiKeys.creatorId, creator.id), eq(apiKeys.name, "Fooshop CLI"))
    );

  // 7. Generate new API key
  const { key, prefix, hash } = generateApiKey();
  await db.insert(apiKeys).values({
    creatorId: creator.id,
    keyHash: hash,
    keyPrefix: prefix,
    name: "Fooshop CLI",
    scopes: [...CREATOR_SCOPES],
  });

  // 8. Redirect to localhost callback
  const redirectUrl = `http://127.0.0.1:${port}/callback?key=${encodeURIComponent(key)}&email=${encodeURIComponent(session.user.email)}`;
  return NextResponse.redirect(redirectUrl, 302);
}
