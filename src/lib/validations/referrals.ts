import { z } from "zod";
import { uuidSchema } from "./common";

export const referralCreateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  affiliateName: z.string().min(1).max(200),
  affiliateEmail: z.string().email().optional(),
  productId: uuidSchema.optional(),
  commissionPercent: z.number().int().min(1).max(100),
});

export const referralUpdateSchema = z.object({
  affiliateName: z.string().min(1).max(200).optional(),
  affiliateEmail: z.string().email().nullable().optional(),
  commissionPercent: z.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
  productId: uuidSchema.nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export type ReferralCreate = z.infer<typeof referralCreateSchema>;
export type ReferralUpdate = z.infer<typeof referralUpdateSchema>;
