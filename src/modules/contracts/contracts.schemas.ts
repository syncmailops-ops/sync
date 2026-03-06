import { z } from "zod";

export const createContractSchema = z.object({
  applicationId: z.string().cuid(),
  terms: z.string().min(1),
  agreedRate: z.number().positive(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
