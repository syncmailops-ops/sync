import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional().nullable(),
  niche: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  socialHandle: z.string().max(200).optional(),
  followerRange: z.enum(["1k-10k", "10k-50k", "50k-200k", "200k-1m", "1m+"]).optional(),
  engagementRate: z.number().min(0).max(100).optional().nullable(),
  companyName: z.string().max(200).optional(),
  founderName: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  phone: z.string().max(15).optional(),
  orgName: z.string().max(200).optional(),
  contactName: z.string().max(200).optional(),
}).strict();

export const avatarSchema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1),
});

export const kycSchema = z.object({
  docKey: z.string().min(1),
  docType: z.enum(["AADHAAR", "PAN"]),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
