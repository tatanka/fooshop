import { z } from "zod";

export const uploadCreateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["file", "cover"]).optional(),
});

export type UploadCreate = z.infer<typeof uploadCreateSchema>;
