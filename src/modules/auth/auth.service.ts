import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../../db/client.js";
import { getEnv } from "../../config/env.js";
import { getRedis } from "../../redis.js";
import { Prisma, type Role } from "@prisma/client"; // Added Prisma here
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.schemas.js";
import { referralService } from "../referrals/referrals.service.js";

const BCRYPT_ROUNDS = 12;
const ACCESS_EXP = "15m";
const REFRESH_EXP_DAYS = 7;
const REFRESH_TTL_SEC = REFRESH_EXP_DAYS * 24 * 60 * 60;
const REFRESH_KEY_PREFIX = "refresh:";

export async function register(
  input: RegisterInput
): Promise<{ userId: string; role: string; message: string }> {
  const env = getEnv();
  const hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const referralCode = await referralService.generateCode();

  // FIX: Added Prisma.TransactionClient type to 'tx'
  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const role = input.role as Role;
    const u = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: hash,
        role,
        status: "PENDING",
      },
    });

    if (input.role === "CREATOR") {
      await tx.creatorProfile.create({
        data: {
          userId: u.id,
          displayName: input.fullName,
          niche: input.niche,
          state: input.state,
          socialHandle: input.socialHandle,
          followerRange: input.followerRange,
        },
      });
    } else if (input.role === "BRAND") {
      await tx.brandProfile.create({
        data: {
          userId: u.id,
          companyName: input.companyName,
          founderName: input.founderName,
          industry: input.industry,
          phone: input.phone,
        },
      });
    } else {
      await tx.organiserProfile.create({
        data: {
          userId: u.id,
          orgName: input.orgName,
          contactName: input.contactName,
          state: input.state,
          phone: input.phone,
        },
      });
    }

    await tx.referral.create({
      data: {
        referrerId: u.id,
        code: referralCode,
        status: "PENDING",
      },
    });

    if ("referralCode" in input && input.referralCode) {
      await referralService.applyCodeAtRegister(tx, input.referralCode, u.id);
    }

    return u;
  });

  const verifyToken = jwt.sign(
    { sub: user.id, purpose: "verify-email" },
    env.JWT_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "24h" }
  );
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: "Verify your Sync account",
        html: `Welcome to Sync! <a href="${verifyUrl}">Click here to verify your email</a>.`,
      });
    } catch (_) {
      // Don't fail registration if email fails
    }
  }

  return {
    userId: user.id,
    role: user.role,
    message: "Registration successful. Check your email to verify your account.",
  };
}

export async function login(
  input: LoginInput
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const env = getEnv();
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.status === "SUSPENDED") {
    throw new Error("Invalid credentials");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: ACCESS_EXP }
  );
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const redis = getRedis();
  await redis.setex(
    REFRESH_KEY_PREFIX + refreshHash,
    REFRESH_TTL_SEC,
    user.id
  );
  const expiresIn = 15 * 60;
  return { accessToken, refreshToken, expiresIn };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const env = getEnv();
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const redis = getRedis();
  const userId = await redis.get(REFRESH_KEY_PREFIX + hash);
  if (!userId) {
    throw new Error("Invalid or expired refresh token");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "SUSPENDED") {
    await redis.del(REFRESH_KEY_PREFIX + hash);
    throw new Error("Invalid refresh token");
  }
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: ACCESS_EXP }
  );
  return { accessToken, expiresIn: 15 * 60 };
}

export async function logout(refreshToken: string): Promise<void> {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const redis = getRedis();
  await redis.del(REFRESH_KEY_PREFIX + hash);
}

export async function verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
  const env = getEnv();
  try {
    const decoded = jwt.verify(input.token, env.JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as { sub: string; purpose?: string };
    if (decoded.purpose !== "verify-email") {
      throw new Error("Invalid token");
    }
    await prisma.user.update({
      where: { id: decoded.sub },
      data: { emailVerified: true },
    });
    return { message: "Email verified" };
  } catch {
    throw new Error("Invalid or expired verification token");
  }
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  const env = getEnv();
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    return { message: "If the email exists, a reset link has been sent." };
  }
  const token = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.setex("reset:" + token, 3600, user.id);
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: "Reset your Sync password",
      html: ` <a href="${resetUrl}">Reset password</a> (valid 1 hour).`,
    });
  }
  return { message: "If the email exists, a reset link has been sent." };
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  const redis = getRedis();
  const userId = await redis.get("reset:" + input.token);
  if (!userId) {
    throw new Error("Invalid or expired reset token");
  }
  const hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });
  await redis.del("reset:" + input.token);
  return { message: "Password reset successful" };
}
