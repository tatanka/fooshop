import { createHash } from "crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
