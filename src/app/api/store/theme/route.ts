import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { validateTheme } from "@/lib/theme";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!validateTheme(body.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const [updated] = await db
    .update(creators)
    .set({ storeTheme: body.theme })
    .where(eq(creators.userId, session.user.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ theme: updated.storeTheme });
}
