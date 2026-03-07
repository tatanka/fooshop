import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStore } from "@/lib/ai";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description } = await req.json();
  const generated = await generateStore(description);

  const slug = generated.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await db
    .update(creators)
    .set({
      storeName: generated.storeName,
      storeDescription: generated.storeDescription,
      storeTheme: generated.theme,
      slug,
    })
    .where(eq(creators.userId, session.user.id));

  return NextResponse.json({ ...generated, slug });
}
