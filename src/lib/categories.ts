export const CATEGORIES = [
  "templates",
  "presets",
  "luts",
  "prompts",
  "guides",
  "courses",
  "assets",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Partial<Record<Category, string>> = { luts: "LUTs" };

export function categoryLabel(cat: string) {
  return (
    CATEGORY_LABELS[cat as Category] ??
    cat.charAt(0).toUpperCase() + cat.slice(1)
  );
}
