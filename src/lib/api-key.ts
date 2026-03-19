import { createHash } from "crypto";
import { db } from "@/db";
import { apiKeys, creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `fsk_${crypto.randomUUID().replace(/-/g, "")}`;
  const prefix = key.slice(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export type ApiKeyAuth = {
  type: "api_key";
  keyId: string;
  scopes: string[];
  creatorId: string | null;
};

export type SessionAuth = {
  type: "session";
  userId: string;
};

export type AuthResult = ApiKeyAuth | SessionAuth | null;

export async function validateApiKey(
  req: NextRequest
): Promise<ApiKeyAuth | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer fsk_")) return null;

  const key = authHeader.slice(7); // Remove "Bearer "
  const hash = hashApiKey(key);

  const [record] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash));

  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, record.id))
    .then(() => {});

  return {
    type: "api_key",
    keyId: record.id,
    scopes: record.scopes,
    creatorId: record.creatorId,
  };
}

export function hasScope(auth: ApiKeyAuth, scope: string): boolean {
  return auth.scopes.includes(scope) || auth.scopes.includes("admin:*");
}

export function insufficientScope(scope: string) {
  return NextResponse.json(
    { error: "Insufficient scope", required: scope },
    { status: 403 }
  );
}

export const CREATOR_SCOPES = [
  "store:read",
  "store:write",
  "products:read",
  "products:write",
  "orders:read",
  "analytics:read",
  "coupons:read",
  "coupons:write",
  "referrals:read",
  "referrals:write",
] as const;

export type CreatorScope = (typeof CREATOR_SCOPES)[number];

type CreatorRow = typeof creators.$inferSelect;

type AuthenticateCreatorSuccess = {
  creator: CreatorRow;
  authType: "session" | "api_key";
  userId?: string;
};

export async function authenticateCreator(
  req: NextRequest,
  requiredScope?: CreatorScope
): Promise<AuthenticateCreatorSuccess | NextResponse> {
  // 1. Check if request has a Bearer token
  const hasBearerToken = req.headers
    .get("authorization")
    ?.startsWith("Bearer fsk_");

  if (hasBearerToken) {
    // If Bearer token present, MUST authenticate via API key — no session fallback
    const apiKeyAuth = await validateApiKey(req);
    if (!apiKeyAuth) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }
    // Check scope
    if (requiredScope && !hasScope(apiKeyAuth, requiredScope)) {
      return insufficientScope(requiredScope);
    }
    // Look up creator by creatorId
    if (!apiKeyAuth.creatorId) {
      return NextResponse.json(
        { error: "API key not linked to a creator" },
        { status: 403 }
      );
    }
    const creator = await db
      .select()
      .from(creators)
      .where(eq(creators.id, apiKeyAuth.creatorId))
      .then((rows) => rows[0]);

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }
    return { creator, authType: "api_key" };
  }

  // 2. Fall back to session auth
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json(
      { error: "Creator not found" },
      { status: 404 }
    );
  }

  return { creator, authType: "session", userId: session.user.id };
}
