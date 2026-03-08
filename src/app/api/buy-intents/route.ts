import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buyIntents, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productId } = await req.json();

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await db
    .select({ id: products.id, creatorId: products.creatorId })
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await db.insert(buyIntents).values({
    productId: product.id,
    creatorId: product.creatorId,
  });

  return NextResponse.json({ ok: true });
}
