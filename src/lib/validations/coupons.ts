import { z } from "zod";
import { uuidSchema } from "./common";

const baseCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  productId: uuidSchema.optional(),
  minAmountCents: z.number().int().min(0).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const couponCreateSchema = baseCouponSchema.refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);

export const couponUpdateSchema = z.object({
  active: z.boolean().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  minAmountCents: z.number().int().min(0).nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  productId: uuidSchema,
});

export type CouponCreate = z.infer<typeof couponCreateSchema>;
export type CouponUpdate = z.infer<typeof couponUpdateSchema>;
export type CouponValidate = z.infer<typeof couponValidateSchema>;
