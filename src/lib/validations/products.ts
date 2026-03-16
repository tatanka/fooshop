import { z } from "zod";
import { priceCentsSchema } from "./common";

export const productCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priceCents: priceCentsSchema,
  category: z.string().min(1).optional(),
  status: z.enum(["draft", "published"]).optional(),
  fileUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
