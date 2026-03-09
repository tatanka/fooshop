const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export function r2PublicUrl(key: string | null | undefined): string | null {
  if (!key || !R2_PUBLIC_URL) return null;
  return `${R2_PUBLIC_URL}/${key}`;
}
