import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateTheme } from "@/lib/ai";
import { validateTheme } from "@/lib/theme";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-theme-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: "both",
    userId: session.user.id,
  });
  if (rateLimitResult) return rateLimitResult;

  const body = await req.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "prompt is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  const theme = await generateTheme(prompt.trim());

  if (!validateTheme(theme)) {
    return NextResponse.json(
      { error: "AI generated an invalid theme. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ theme });
}
