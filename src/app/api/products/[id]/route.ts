import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteObject } from "@/lib/r2";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { productUpdateSchema } from "@/lib/validations/products";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateCreator(req, "products:read");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const { id } = await params;

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
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const { id } = await params;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const schemaResult = productUpdateSchema.safeParse(body);
  if (!schemaResult.success) return validationError(schemaResult.error);

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
  if (schemaResult.data.fileUrl && current.fileUrl && schemaResult.data.fileUrl !== current.fileUrl) {
    cleanups.push(deleteObject(current.fileUrl).catch(() => {}));
  }
  if (schemaResult.data.coverImageUrl && current.coverImageUrl && schemaResult.data.coverImageUrl !== current.coverImageUrl) {
    cleanups.push(deleteObject(current.coverImageUrl).catch(() => {}));
  }
  if (cleanups.length > 0) {
    await Promise.all(cleanups);
  }

  const { title, description, priceCents, category, status, fileUrl, coverImageUrl } = schemaResult.data;
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
  const result = await authenticateCreator(req, "products:write");
  if (result instanceof NextResponse) return result;
  const { creator } = result;

  const { id } = await params;

  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  return NextResponse.json({ ok: true });
}
