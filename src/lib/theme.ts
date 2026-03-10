import type { StoreTheme } from "@/db/schema";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VALID_FONTS = new Set(["sans", "serif", "mono"]);
const VALID_HERO_STYLES = new Set(["gradient", "solid", "minimal"]);
const VALID_LAYOUTS = new Set(["grid", "featured", "list"]);

export function validateTheme(theme: unknown): theme is StoreTheme {
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
