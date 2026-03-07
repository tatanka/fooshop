import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where = category
    ? and(eq(products.status, "published"), eq(products.category, category))
    : eq(products.status, "published");

  const results = await db.select().from(products).where(where).limit(50);

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const [product] = await db
    .insert(products)
    .values({
      creatorId: creator.id,
      title: body.title,
      slug,
      description: body.description,
      priceCents: body.priceCents,
      category: body.category,
      status: "draft",
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
