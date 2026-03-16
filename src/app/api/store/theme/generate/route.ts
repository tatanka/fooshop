import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateTheme } from "@/lib/ai";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { themeGenerateSchema, themeSchema } from "@/lib/validations/store";

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

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const result = themeGenerateSchema.safeParse(body);
  if (!result.success) return validationError(result.error);

  const theme = await generateTheme(result.data.prompt.trim());

  if (!themeSchema.safeParse(theme).success) {
    return NextResponse.json(
      { error: "AI generated an invalid theme. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ theme });
}
