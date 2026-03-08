import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteObject } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const body = await req.json();

  // Fetch current product to check for file replacement
  const [current] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Clean up old R2 files if being replaced
  if (body.fileUrl && current.fileUrl && body.fileUrl !== current.fileUrl) {
    await deleteObject(current.fileUrl).catch(() => {});
  }
  if (body.coverImageUrl && current.coverImageUrl && body.coverImageUrl !== current.coverImageUrl) {
    await deleteObject(current.coverImageUrl).catch(() => {});
  }

  const [updated] = await db
    .update(products)
    .set(body)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  return NextResponse.json({ ok: true });
}
