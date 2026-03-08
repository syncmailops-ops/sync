import { prisma } from "../../db/client.js";
import type { JoinWaitlistInput } from "./waitlist.schemas.js";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

export async function join(input: JoinWaitlistInput) {
  try {
    // Check if already on waitlist
    const existing = await prisma.waitlist.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      return {
        message: "Already on waitlist",
        referralCode: existing.referralCode,
      };
    }

    // Generate unique referral code
    let referralCode = nanoid();
    while (await prisma.waitlist.findUnique({ where: { referralCode } })) {
      referralCode = nanoid();
    }

    // Create new waitlist entry
    const user = await prisma.waitlist.create({
      data: {
        email: input.email,
        role: input.role,
        name: input.name ?? null,
        referralCode,
        referredBy: input.referredBy ?? null,
      },
    });

    // Increment referral count for the referrer
    if (input.referredBy) {
      await prisma.waitlist.updateMany({
        where: { referralCode: input.referredBy },
        data: { referralCount: { increment: 1 } },
      });
    }

    return {
      message: "Joined waitlist",
      referralCode: user.referralCode,
    };
  } catch (err) {
    throw new Error("Failed to join waitlist");
  }
}
