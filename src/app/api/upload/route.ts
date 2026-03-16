import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { uploadCreateSchema } from "@/lib/validations/upload";

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

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = uploadCreateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { filename, contentType, purpose } = result.data;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const maxMB = purpose === "cover" ? MAX_COVER_SIZE_MB : MAX_FILE_SIZE_MB;
  const maxBytes = maxMB * 1024 * 1024;

  const key = `products/${session.user.id}/${randomUUID()}/${safeName}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxBytes });
}
