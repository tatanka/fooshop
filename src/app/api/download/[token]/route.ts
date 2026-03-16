import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { downloadTokens, orders, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await db
    .select({
      tokenId: downloadTokens.id,
      expiresAt: downloadTokens.expiresAt,
      fileUrl: products.fileUrl,
    })
    .from(downloadTokens)
    .innerJoin(orders, eq(downloadTokens.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(downloadTokens.token, token))
    .then((rows) => rows[0]);

  if (!result) {
    return NextResponse.json({ error: "Invalid download link" }, { status: 404 });
  }

  if (new Date() > result.expiresAt) {
    return NextResponse.json({ error: "Download link expired" }, { status: 410 });
  }

  if (!result.fileUrl) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  // Increment download count and generate presigned URL in parallel
  try {
    const [, presignedUrl] = await Promise.all([
      db
        .update(downloadTokens)
        .set({ downloadCount: sql`${downloadTokens.downloadCount} + 1` })
        .where(eq(downloadTokens.id, result.tokenId)),
      getDownloadUrl(result.fileUrl),
    ]);

    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { flow: "download" },
      extra: { tokenId: result.tokenId, fileUrl: result.fileUrl },
    });
    console.error("Download failed:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
