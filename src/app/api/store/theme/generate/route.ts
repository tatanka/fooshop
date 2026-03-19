import { NextRequest, NextResponse } from "next/server";
import { authenticateCreator } from "@/lib/api-key";
import { rateLimit } from "@/lib/rate-limit";
import { generateTheme } from "@/lib/ai";
import { parseBody, validationError } from "@/lib/validations/helpers";
import { themeGenerateSchema, themeSchema } from "@/lib/validations/store";

export async function POST(req: NextRequest) {
  const result = await authenticateCreator(req, "store:write");
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const rateLimitResult = await rateLimit(req, {
    endpoint: "store-theme-generate",
    limit: 5,
    windowMs: 60_000,
    keyStrategy: userId ? "both" : "ip",
    ...(userId && { userId }),
  });
  if (rateLimitResult) return rateLimitResult;

  const { data: body, error: parseError } = await parseBody(req);
  if (parseError) return parseError;
  const validated = themeGenerateSchema.safeParse(body);
  if (!validated.success) return validationError(validated.error);

  const theme = await generateTheme(validated.data.prompt.trim());

  if (!themeSchema.safeParse(theme).success) {
    return NextResponse.json(
      { error: "AI generated an invalid theme. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ theme });
}
