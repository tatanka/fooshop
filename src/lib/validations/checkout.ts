import { z } from "zod";
import { uuidSchema } from "./common";

export const checkoutCreateSchema = z.object({
  productId: uuidSchema,
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
  source: z.enum(["web", "mcp", "api"]).optional(),
});

export type CheckoutCreate = z.infer<typeof checkoutCreateSchema>;
