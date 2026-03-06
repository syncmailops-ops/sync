import { z } from "zod";

export const applySchema = z.object({
  proposedRate: z.number().positive(),
  message: z.string().max(2000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]),
});

export type ApplyInput = z.infer<typeof applySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
