import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import type { StoreTheme } from "@/db/schema";
import { eq } from "drizzle-orm";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VALID_FONTS = new Set(["sans", "serif", "mono"]);
const VALID_HERO_STYLES = new Set(["gradient", "solid", "minimal"]);
const VALID_LAYOUTS = new Set(["grid", "featured", "list"]);

function validateTheme(theme: unknown): theme is StoreTheme {
  if (!theme || typeof theme !== "object") return false;
  const t = theme as Record<string, unknown>;

  const colorFields = [
    "primaryColor",
    "secondaryColor",
    "backgroundColor",
    "textColor",
    "accentColor",
  ];
  for (const field of colorFields) {
    if (typeof t[field] !== "string" || !HEX_COLOR_RE.test(t[field] as string))
      return false;
  }

  if (!VALID_FONTS.has(t.fontFamily as string)) return false;
  if (!VALID_HERO_STYLES.has(t.heroStyle as string)) return false;
  if (!VALID_LAYOUTS.has(t.layout as string)) return false;

  return true;
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!validateTheme(body.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const [updated] = await db
    .update(creators)
    .set({ storeTheme: body.theme })
    .where(eq(creators.userId, session.user.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ theme: updated.storeTheme });
}
