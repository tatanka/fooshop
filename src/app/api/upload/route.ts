import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { rateLimit } from "@/lib/rate-limit";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { uploadCreateSchema } from "@/lib/validations/upload";

const MAX_FILE_SIZE_MB = 100;
const MAX_COVER_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  const authResult = await authenticateCreator(req, "products:write");
  if (authResult instanceof NextResponse) return authResult;
  const { creator, userId } = authResult;

  if (userId) Sentry.setUser({ id: userId });

  const rateLimitResult = await rateLimit(req, {
    endpoint: "upload",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
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

  try {
    const key = `products/${creator.userId}/${randomUUID()}/${safeName}`;
    const uploadUrl = await getUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxBytes });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { flow: "upload" },
      extra: { userId: creator.userId, filename: safeName, purpose },
    });
    console.error("Upload presigned URL generation failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
