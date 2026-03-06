import { prisma } from "../../db/client.js";
import type { AppStatus } from "@prisma/client";
import type { ApplyInput, UpdateStatusInput } from "./applications.schemas.js";
import { notificationService } from "../notifications/notifications.service.js";

export async function apply(
  campaignId: string,
  creatorId: string,
  input: ApplyInput
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "ACTIVE") throw new Error("Campaign is not open for applications");
  if (campaign.filledSlots >= campaign.totalSlots) throw new Error("No slots left");

  const existing = await prisma.application.findUnique({
    where: {
      campaignId_creatorId: { campaignId, creatorId },
    },
  });
  if (existing) throw new Error("Already applied");

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        campaignId,
        creatorId,
        proposedRate: input.proposedRate,
        message: input.message ?? null,
        status: "APPLIED",
      },
    });
    const brand = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true },
    });
    if (brand) {
      await notificationService.create(
        brand.brandId,
        "application_received",
        "New application",
        `A creator applied to your campaign.`
      );
    }
    return app;
  });

  return application;
}

export async function listByCampaign(campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId },
  });
  if (!campaign) throw new Error("Campaign not found");
  return prisma.application.findMany({
    where: { campaignId },
    include: {
      creator: {
        select: {
          id: true,
          creatorProfile: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });
}

export async function updateStatus(
  campaignId: string,
  appId: string,
  brandId: string,
  input: UpdateStatusInput
) {
  const app = await prisma.application.findFirst({
    where: { id: appId, campaignId },
    include: { campaign: true },
  });
  if (!app || app.campaign.brandId !== brandId) throw new Error("Application not found");

  const status = input.status as AppStatus;
  await prisma.application.update({
    where: { id: appId },
    data: { status },
  });

  const notifType =
    status === "SHORTLISTED"
      ? "shortlisted"
      : status === "ACCEPTED"
        ? "accepted"
        : "rejected";
  await notificationService.create(
    app.creatorId,
    notifType,
    `Application ${status.toLowerCase()}`,
    `Your application was ${status.toLowerCase()}.`
  );

  if (status === "ACCEPTED") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { filledSlots: { increment: 1 } },
    });
  }

  return prisma.application.findUnique({
    where: { id: appId },
    include: { creator: { select: { creatorProfile: true } } },
  });
}

export async function getMyApplication(campaignId: string, creatorId: string) {
  return prisma.application.findUnique({
    where: {
      campaignId_creatorId: { campaignId, creatorId },
    },
    include: { campaign: { select: { title: true, status: true } } },
  });
}

export async function listMyApplications(creatorId: string) {
  return prisma.application.findMany({
    where: { creatorId },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          status: true,
          brand: { select: { brandProfile: true } },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });
}
