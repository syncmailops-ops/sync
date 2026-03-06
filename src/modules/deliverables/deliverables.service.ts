import { prisma } from "../../db/client.js";
import type { DeliverableStatus } from "@prisma/client";
import type { SubmitDeliverableInput, UpdateDeliverableStatusInput } from "./deliverables.schemas.js";
import { notificationService } from "../notifications/notifications.service.js";

export async function submitDeliverable(
  contractId: string,
  creatorId: string,
  input: SubmitDeliverableInput
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract || contract.creatorId !== creatorId) {
    throw new Error("Contract not found");
  }
  const deliverable = await prisma.deliverable.create({
    data: {
      contractId,
      creatorId,
      fileUrl: input.fileUrl,
      status: "PENDING",
    },
  });
  const brand = await prisma.user.findUnique({
    where: { id: contract.brandId },
  });
  if (brand) {
    await notificationService.create(
      contract.brandId,
      "deliverable_submitted",
      "Deliverable submitted",
      "Creator has submitted a deliverable for your review."
    );
  }
  return deliverable;
}

export async function listDeliverables(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract || (contract.creatorId !== userId && contract.brandId !== userId)) {
    throw new Error("Contract not found");
  }
  return prisma.deliverable.findMany({
    where: { contractId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function updateDeliverableStatus(
  contractId: string,
  deliverableId: string,
  brandId: string,
  input: UpdateDeliverableStatusInput
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract || contract.brandId !== brandId) throw new Error("Contract not found");

  const status = input.status as DeliverableStatus;
  await prisma.deliverable.update({
    where: { id: deliverableId, contractId },
    data: {
      status,
      ...(input.feedback != null && { feedback: input.feedback }),
    },
  });

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
  });
  if (deliverable) {
    await notificationService.create(
      deliverable.creatorId,
      status === "APPROVED" ? "deliverable_approved" : "revision_requested",
      status === "APPROVED" ? "Deliverable approved" : "Revision requested",
      input.feedback ?? (status === "APPROVED" ? "Your deliverable was approved." : "Please submit a revision.")
    );
  }

  const allDeliverables = await prisma.deliverable.findMany({
    where: { contractId },
  });
  const allApproved =
    allDeliverables.length > 0 &&
    allDeliverables.every((d) => d.status === "APPROVED");
  if (allApproved) {
    const escrowModule = await import("../escrow/escrow.service.js");
    await escrowModule.releaseEscrowForContract(contractId);
    await notificationService.create(
      contract.creatorId,
      "escrow_released",
      "Payment released",
      "All deliverables approved. Payment has been released."
    );
    await notificationService.create(
      contract.brandId,
      "escrow_released",
      "Payment released",
      "Deliverables completed. Payment has been transferred to the creator."
    );
  }

  return prisma.deliverable.findUnique({
    where: { id: deliverableId },
  });
}
