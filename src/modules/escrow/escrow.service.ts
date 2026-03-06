import crypto from "node:crypto";
import Razorpay from "razorpay";
import { prisma } from "../../db/client.js";
import type { PrismaClient } from "@prisma/client";
import { getEnv } from "../../config/env.js";
import { notificationService } from "../notifications/notifications.service.js";

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpay) {
    const env = getEnv();
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay not configured");
    }
    razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const env = getEnv();
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function createEscrowForContract(contractId: string): Promise<void> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract) throw new Error("Contract not found");
  const existing = await prisma.escrow.findUnique({
    where: { contractId },
  });
  if (existing) return;
  const amountPaise = Math.round(Number(contract.agreedRate) * 100);
  await prisma.escrow.create({
    data: {
      contractId,
      amount: contract.agreedRate,
      status: "PENDING",
    },
  });
}

export async function createRazorpayOrder(contractId: string, brandId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract || contract.brandId !== brandId) {
    throw new Error("Contract not found");
  }
  const escrow = await prisma.escrow.findUnique({
    where: { contractId },
  });
  if (!escrow || escrow.status !== "PENDING") {
    throw new Error("Escrow not found or already processed");
  }
  const amountPaise = Math.round(Number(contract.agreedRate) * 100);
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `contract_${contractId}`,
  });
  await prisma.escrow.update({
    where: { contractId },
    data: { razorpayOrderId: order.id },
  });
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getEnv().RAZORPAY_KEY_ID,
  };
}

export async function handlePaymentCaptured(paymentId: string, orderId: string) {
  const escrow = await prisma.escrow.findFirst({
    where: { razorpayOrderId: orderId },
    include: { contract: true },
  });
  if (!escrow) return;
  await prisma.escrow.update({
    where: { id: escrow.id },
    data: {
      status: "HELD",
      razorpayPaymentId: paymentId,
      heldAt: new Date(),
    },
  });
  await notificationService.create(
    escrow.contract.creatorId,
    "escrow_held",
    "Payment held in escrow",
    "The brand has paid. Funds are held until deliverables are approved."
  );
}

export async function releaseEscrow(escrowId: string, userId: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: { contract: true },
  });
  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "HELD") {
    throw new Error("Escrow must be HELD to release");
  }
  const isAdmin = (await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  }))?.role === "ADMIN";
  if (escrow.contract.brandId !== userId && !isAdmin) {
    throw new Error("Only brand or admin can trigger release");
  }
  const paymentId = escrow.razorpayPaymentId;
  if (!paymentId) throw new Error("No payment linked to escrow");
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: escrow.contract.creatorId },
  });
  const bankDetails = creator?.bankDetails;
  if (!bankDetails) throw new Error("Creator bank details not set");
  const { decrypt } = await import("../../utils/crypto.js");
  const accountPayload = JSON.parse(decrypt(bankDetails)) as { linkedAccountId?: string };
  const linkedAccountId = accountPayload.linkedAccountId;
  if (!linkedAccountId) throw new Error("Creator Razorpay Route account not linked");
  const rzp = getRazorpay();
  const amountPaise = Math.round(Number(escrow.amount) * 100);
  try {
    await rzp.payments.transfer(paymentId, {
      transfers: [
        {
          account: linkedAccountId,
          amount: amountPaise,
          currency: "INR",
        },
      ],
    });
  } catch (_) {
    throw new Error("Razorpay transfer failed. Ensure Route/account is set up.");
  }
  await prisma.escrow.update({
    where: { id: escrowId },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  const referralModule = await import("../referrals/referrals.service.js");
  await referralModule.processReferralConversion(escrow.contract.creatorId);
  return prisma.escrow.findUnique({ where: { id: escrowId } });
}

export async function releaseEscrowForContract(contractId: string): Promise<void> {
  const escrow = await prisma.escrow.findUnique({
    where: { contractId },
    include: { contract: true },
  });
  if (!escrow || escrow.status !== "HELD") return;
  const rzp = getRazorpay();
  const paymentId = escrow.razorpayPaymentId;
  if (!paymentId) return;
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: escrow.contract.creatorId },
  });
  const bankDetails = creator?.bankDetails;
  if (!bankDetails) return;
  const { decrypt } = await import("../../utils/crypto.js");
  const accountPayload = JSON.parse(decrypt(bankDetails)) as { linkedAccountId?: string };
  const linkedAccountId = accountPayload.linkedAccountId;
  if (!linkedAccountId) return;
  const amountPaise = Math.round(Number(escrow.amount) * 100);
  try {
    await rzp.payments.transfer(paymentId, {
      transfers: [
        {
          account: linkedAccountId,
          amount: amountPaise,
          currency: "INR",
        },
      ],
    });
  } catch (_) {
    return;
  }
  await prisma.escrow.update({
    where: { id: escrow.id },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
  const referralModule = await import("../referrals/referrals.service.js");
  await referralModule.processReferralConversion(escrow.contract.creatorId);
}

export async function refundEscrow(escrowId: string, userId: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: { contract: true },
  });
  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "HELD") throw new Error("Escrow must be HELD to refund");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Only admin can refund");
  const rzp = getRazorpay();
  const paymentId = escrow.razorpayPaymentId;
  if (!paymentId) throw new Error("No payment linked");
  await rzp.payments.refund(paymentId, { amount: Math.round(Number(escrow.amount) * 100) });
  await prisma.escrow.update({
    where: { id: escrowId },
    data: { status: "REFUNDED" },
  });
  return prisma.escrow.findUnique({ where: { id: escrowId } });
}
