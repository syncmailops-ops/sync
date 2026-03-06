import crypto from "node:crypto";
import { prisma } from "../../db/client.js";
import type { PrismaClient } from "@prisma/client";
import { notificationService } from "../notifications/notifications.service.js";

const CODE_LENGTH = 8;
const ALPHANUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const REWARD_AMOUNT = 5000;

export async function generateCode(): Promise<string> {
  let code: string = "";
  let exists = true;
  while (exists) {
    code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += ALPHANUM[crypto.randomInt(0, ALPHANUM.length)];
    }
    const found = await prisma.referral.findUnique({ where: { code } });
    exists = !!found;
  }
  return code;
}

export async function applyCodeAtRegister(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  code: string,
  referredUserId: string
): Promise<void> {
  const referral = await tx.referral.findFirst({
    where: { code, referredId: null },
  });
  if (referral && referral.referrerId !== referredUserId) {
    await tx.referral.update({
      where: { id: referral.id },
      data: { referredId: referredUserId },
    });
  }
}

export async function processReferralConversion(referredUserId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referredId: referredUserId, status: "PENDING" },
  });
  if (!referral) return;
  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
  });
  try {
    const { getEnv } = await import("../../config/env.js");
    const env = getEnv();
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      const Razorpay = (await import("razorpay")).default;
      const rzp = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
      const referrer = await prisma.creatorProfile.findUnique({
        where: { userId: referral.referrerId },
      });
      if (referrer?.bankDetails) {
        const { decrypt } = await import("../../utils/crypto.js");
        const payload = JSON.parse(decrypt(referrer.bankDetails)) as { linkedAccountId?: string };
        if (payload.linkedAccountId) {
          await (rzp as unknown as { payouts?: { create: (o: { account_number: string; amount: number; currency: string; purpose: string }) => Promise<unknown> } }).payouts?.create?.({
            account_number: payload.linkedAccountId,
            amount: REWARD_AMOUNT * 100,
            currency: "INR",
            purpose: "referral_reward",
          });
        }
      }
    }
  } catch (_) {
    // Payout may need Razorpay Route; log and skip
  }
  await notificationService.create(
    referral.referrerId,
    "referral_converted",
    "Referral reward",
    "Your referred user completed their first campaign. You've earned ₹5000."
  );
}

export async function getMyCode(userId: string) {
  const referral = await prisma.referral.findFirst({
    where: { referrerId: userId },
  });
  if (!referral) throw new Error("Referral code not found");
  const env = (await import("../../config/env.js")).getEnv();
  const shareLink = `${env.FRONTEND_URL}/signup?ref=${referral.code}`;
  return { code: referral.code, shareLink };
}

export async function getStats(userId: string) {
  const [totalReferrals, conversions, agg] = await Promise.all([
    prisma.referral.count({ where: { referrerId: userId } }),
    prisma.referral.count({ where: { referrerId: userId, status: "CONVERTED" } }),
    prisma.referral.aggregate({
      where: { referrerId: userId, status: "CONVERTED" },
      _sum: { rewardAmount: true },
    }),
  ]);
  return {
    totalReferrals,
    conversions,
    totalEarned: Number(agg._sum.rewardAmount ?? 0),
  };
}

export const referralService = {
  generateCode,
  applyCodeAtRegister,
  processReferralConversion,
  getMyCode,
  getStats,
};
