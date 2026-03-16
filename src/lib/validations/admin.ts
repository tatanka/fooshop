import { z } from "zod";
import { uuidSchema, storeNameSchema, storeDescriptionSchema, atLeastOneField } from "./common";
import { baseCouponSchema } from "./coupons";

export const adminCouponCreateSchema = baseCouponSchema
  .extend({ creatorId: uuidSchema })
  .refine(
    (d) => !(d.discountType === "percentage" && (d.discountValue < 1 || d.discountValue > 100)),
    { message: "Percentage discount must be between 1 and 100", path: ["discountValue"] }
  );

export const adminCreatorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  storeName: storeNameSchema.optional(),
  storeDescription: storeDescriptionSchema.optional(),
  commissionOverridePercent: z.number().int().min(0).max(100).nullable().optional(),
  commissionOverrideExpiresAt: z.string().datetime().nullable().optional(),
}).refine(atLeastOneField.refine, { message: atLeastOneField.message });

export type AdminCouponCreate = z.infer<typeof adminCouponCreateSchema>;
export type AdminCreatorUpdate = z.infer<typeof adminCreatorUpdateSchema>;
