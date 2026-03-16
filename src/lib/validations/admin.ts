import { z } from "zod";
import { uuidSchema } from "./common";

export const adminCouponCreateSchema = z.object({
  creatorId: uuidSchema,
  code: z.string().min(1).max(50).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().positive(),
  productId: uuidSchema.optional(),
  minAmountCents: z.number().int().min(0).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
}).refine(
  (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
  { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
);

export const adminCreatorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  storeName: z.string().min(1).max(100).optional(),
  storeDescription: z.string().max(2000).optional(),
  commissionOverridePercent: z.number().int().min(0).max(100).nullable().optional(),
  commissionOverrideExpiresAt: z.string().datetime().nullable().optional(),
}).refine(
  (obj) => Object.values(obj).some((v) => v !== undefined),
  { message: "At least one field is required" }
);

export type AdminCouponCreate = z.infer<typeof adminCouponCreateSchema>;
export type AdminCreatorUpdate = z.infer<typeof adminCreatorUpdateSchema>;
