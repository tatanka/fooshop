import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const priceCentsSchema = z.number().int().min(0);
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const storeNameSchema = z.string().min(1).max(100);
export const storeDescriptionSchema = z.string().max(2000);

export const atLeastOneField = {
  refine: (obj: Record<string, unknown>) => Object.values(obj).some((v) => v !== undefined),
  message: "At least one field is required",
} as const;
