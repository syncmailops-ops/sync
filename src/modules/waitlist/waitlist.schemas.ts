import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z.string().email(),
  role: z.enum(["CREATOR", "BRAND", "ORGANISER"]),
  name: z.string().max(200).optional(),
  referredBy: z.string().optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
