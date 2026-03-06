import { z } from "zod";

const trimString = (s: unknown) => (typeof s === "string" ? s.trim() : s);
const referralCodeOptional = z
  .string()
  .length(8)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const registerCreatorSchema = z.object({
  role: z.literal("CREATOR"),
  fullName: z.string().transform(trimString).pipe(z.string().min(1, "Name is required").max(200)),
  phone: z.string().transform(trimString).pipe(z.string().min(10, "Enter a valid 10-digit phone number").max(15)),
  socialHandle: z.string().transform(trimString).pipe(z.string().min(1, "Social handle is required").max(200)),
  followerRange: z.enum(["1k-10k", "10k-50k", "50k-200k", "200k-1m", "1m+"], {
    errorMap: () => ({ message: "Please select a follower range" }),
  }),
  state: z.string().transform(trimString).pipe(z.string().min(1, "State is required").max(100)),
  niche: z.string().transform(trimString).pipe(z.string().min(1, "Niche is required").max(200)),
  email: z.string().transform(trimString).pipe(z.string().email("Enter a valid email address")),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  referralCode: referralCodeOptional,
});

export const registerBrandSchema = z.object({
  role: z.literal("BRAND"),
  companyName: z.string().transform(trimString).pipe(z.string().min(1, "Company name is required").max(200)),
  founderName: z.string().transform(trimString).pipe(z.string().min(1, "Founder name is required").max(200)),
  email: z.string().transform(trimString).pipe(z.string().email("Enter a valid email address")),
  phone: z.string().transform(trimString).pipe(z.string().min(10, "Enter a valid 10-digit phone number").max(15)),
  industry: z.string().transform(trimString).pipe(z.string().min(1, "Industry is required").max(200)),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  referralCode: referralCodeOptional,
});

export const registerOrganiserSchema = z.object({
  role: z.literal("ORGANISER"),
  orgName: z.string().transform(trimString).pipe(z.string().min(1, "Organisation name is required").max(200)),
  contactName: z.string().transform(trimString).pipe(z.string().min(1, "Contact name is required").max(200)),
  email: z.string().transform(trimString).pipe(z.string().email("Enter a valid email address")),
  phone: z.string().transform(trimString).pipe(z.string().min(10, "Enter a valid 10-digit phone number").max(15)),
  state: z.string().transform(trimString).pipe(z.string().min(1, "State is required").max(100)),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  referralCode: referralCodeOptional,
});

export const registerSchema = z.discriminatedUnion("role", [
  registerCreatorSchema,
  registerBrandSchema,
  registerOrganiserSchema,
]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
