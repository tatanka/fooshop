import { z } from "zod";
import { uuidSchema, atLeastOneField } from "./common";

export const referralCreateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  affiliateName: z.string().min(1).max(200).transform((s) => s.trim()),
  affiliateEmail: z.string().email().optional(),
  productId: uuidSchema.optional(),
  commissionPercent: z.number().int().min(1).max(100),
});

export const referralUpdateSchema = z.object({
  affiliateName: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
  affiliateEmail: z.string().email().nullable().optional(),
  commissionPercent: z.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
  productId: uuidSchema.nullable().optional(),
}).refine(atLeastOneField.refine, { message: atLeastOneField.message });

export type ReferralCreate = z.infer<typeof referralCreateSchema>;
export type ReferralUpdate = z.infer<typeof referralUpdateSchema>;
