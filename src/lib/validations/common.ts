import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const priceCentsSchema = z.number().int().min(0);
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
