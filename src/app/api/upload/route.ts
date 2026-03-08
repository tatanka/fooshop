import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE_MB = 100;
const MAX_COVER_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, purpose } = await req.json();

  const maxMB = purpose === "cover" ? MAX_COVER_SIZE_MB : MAX_FILE_SIZE_MB;

  const key = `products/${session.user.id}/${randomUUID()}/${filename}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxMB * 1024 * 1024 });
}
