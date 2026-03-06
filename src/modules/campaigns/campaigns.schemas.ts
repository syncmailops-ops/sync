import { z } from "zod";

export const listCampaignsSchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "COMPLETED"]).optional().default("ACTIVE"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  budgetMin: z.number().positive(),
  budgetMax: z.number().positive(),
  totalSlots: z.number().int().min(1),
  location: z.string().min(1).max(200),
  platforms: z.array(z.string()).min(1).max(10),
  deliverables: z.string().min(1),
  deadline: z.string().datetime().or(z.coerce.date().transform((d) => d.toISOString())),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
