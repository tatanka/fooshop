import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, creators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteObject } from "@/lib/r2";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { productUpdateSchema } from "@/lib/validations/products";

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

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = productUpdateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  // Fetch current product to check for file replacement
  const [current] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Clean up old R2 files if being replaced (parallel, fire-and-forget)
  const cleanups: Promise<void>[] = [];
  if (result.data.fileUrl && current.fileUrl && result.data.fileUrl !== current.fileUrl) {
    cleanups.push(deleteObject(current.fileUrl).catch(() => {}));
  }
  if (result.data.coverImageUrl && current.coverImageUrl && result.data.coverImageUrl !== current.coverImageUrl) {
    cleanups.push(deleteObject(current.coverImageUrl).catch(() => {}));
  }
  if (cleanups.length > 0) {
    await Promise.all(cleanups);
  }

  const { title, description, priceCents, category, status, fileUrl, coverImageUrl } = result.data;
  const [updated] = await db
    .update(products)
    .set({ title, description, priceCents, category, status, fileUrl, coverImageUrl })
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
