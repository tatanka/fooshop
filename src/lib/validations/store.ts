import { z } from "zod";
import { hexColorSchema, storeNameSchema, storeDescriptionSchema } from "./common";

export const storeUpdateSchema = z.object({
  storeName: storeNameSchema.optional(),
  storeDescription: storeDescriptionSchema.optional(),
});

export const themeSchema = z.object({
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
  accentColor: hexColorSchema,
  fontFamily: z.enum(["sans", "serif", "mono"]),
  heroStyle: z.enum(["gradient", "solid", "minimal"]),
  layout: z.enum(["grid", "featured", "list"]),
});

export const themeUpdateSchema = z.object({
  theme: themeSchema,
});

export const themeGenerateSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export const storeGenerateSchema = z.object({
  description: z.string().min(1).max(2000),
});

export type StoreUpdate = z.infer<typeof storeUpdateSchema>;
export type ThemeData = z.infer<typeof themeSchema>;
export type ThemeGenerate = z.infer<typeof themeGenerateSchema>;
export type StoreGenerate = z.infer<typeof storeGenerateSchema>;
