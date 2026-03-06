import { prisma } from "../../db/client.js";
import type { Status } from "@prisma/client";

export type ListUsersInput = { role?: "CREATOR" | "BRAND" | "ORGANISER" | "ADMIN"; status?: Status; page: number; limit: number };
export type UpdateUserStatusInput = { status: "VERIFIED" | "SUSPENDED" };
export type ResolveDisputeInput = { action: "release" | "refund" };

export async function listUsers(input: ListUsersInput) {
  const where: { role?: string; status?: Status } = {};
  if (input.role) where.role = input.role;
  if (input.status) where.status = input.status;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: input.page, limit: input.limit };
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput) {
  return prisma.user.update({
    where: { id: userId },
    data: { status: input.status },
  });
}

export async function listDisputes() {
  const escrows = await prisma.escrow.findMany({
    where: { status: "HELD" },
    include: {
      contract: {
        include: {
          application: { include: { campaign: true } },
          creator: { select: { id: true, creatorProfile: true } },
        },
      },
    },
  });
  return escrows;
}

export async function resolveDispute(escrowId: string, adminUserId: string, input: ResolveDisputeInput) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: { contract: true },
  });
  if (!escrow || escrow.status !== "HELD") {
    throw new Error("Escrow not found or not in HELD state");
  }
  const escrowModule = await import("../escrow/escrow.service.js");
  if (input.action === "release") {
    await escrowModule.releaseEscrow(escrowId, adminUserId);
  } else {
    await escrowModule.refundEscrow(escrowId, adminUserId);
  }
  return prisma.escrow.findUnique({ where: { id: escrowId } });
}

export async function exportWaitlistCsv(): Promise<string> {
  const rows = await prisma.waitlist.findMany({
    orderBy: { createdAt: "asc" },
  });
  const header = "email,role,name,createdAt\n";
  const lines = rows.map(
    (r) => `${r.email},${r.role},${r.name ?? ""},${r.createdAt.toISOString()}`
  );
  return header + lines.join("\n");
}
