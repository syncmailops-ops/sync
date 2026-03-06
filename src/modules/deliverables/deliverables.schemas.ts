import { z } from "zod";

export const submitDeliverableSchema = z.object({
  fileUrl: z.string().url(),
});

export const updateDeliverableStatusSchema = z.object({
  status: z.enum(["APPROVED", "REVISION_REQUESTED"]),
  feedback: z.string().max(2000).optional(),
});

export type SubmitDeliverableInput = z.infer<typeof submitDeliverableSchema>;
export type UpdateDeliverableStatusInput = z.infer<typeof updateDeliverableStatusSchema>;
