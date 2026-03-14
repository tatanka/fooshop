import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const normalizedCode = code.toUpperCase().trim();

  // Atomic increment of click count
  const updated = await db
    .update(referrals)
    .set({ clickCount: sql`${referrals.clickCount} + 1` })
    .where(
      and(
        eq(referrals.code, normalizedCode),
        eq(referrals.active, true)
      )
    )
    .returning({ id: referrals.id });

  if (updated.length === 0) {
    // Soft failure: code not found or inactive, just return ok
    return NextResponse.json({ tracked: false });
  }

  return NextResponse.json({ tracked: true });
}
