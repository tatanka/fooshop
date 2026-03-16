import { z } from "zod";
import { uuidSchema } from "./common";

export const buyIntentCreateSchema = z.object({
  productId: uuidSchema,
});

export type BuyIntentCreate = z.infer<typeof buyIntentCreateSchema>;
