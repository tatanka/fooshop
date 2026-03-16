import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE_MB = 100;
const MAX_COVER_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await rateLimit(req, {
    endpoint: "upload",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;

  const { filename, contentType, purpose } = await req.json();

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  if (purpose && !["file", "cover"].includes(purpose)) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const maxMB = purpose === "cover" ? MAX_COVER_SIZE_MB : MAX_FILE_SIZE_MB;
  const maxBytes = maxMB * 1024 * 1024;

  const key = `products/${session.user.id}/${randomUUID()}/${safeName}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxBytes });
}
