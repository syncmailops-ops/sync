import { prisma } from "../../db/client.js";
import type { CampaignStatus } from "@prisma/client";
import type { ListCampaignsInput, CreateCampaignInput, UpdateCampaignInput } from "./campaigns.schemas.js";
import { updateCampaignEmbedding } from "../ai/embedding.service.js";

export async function listCampaigns(input: ListCampaignsInput) {
  const { page, limit, category, location, budgetMin, budgetMax, status } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (budgetMin != null) where.budgetMin = { gte: budgetMin };
  if (budgetMax != null) where.budgetMax = { lte: budgetMax };

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { brand: { select: { id: true, brandProfile: true } } },
    }),
    prisma.campaign.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getRecommendedForCreator(creatorId: string, limit = 10) {
  try {
    const rows = await (await import("../ai/embedding.service.js")).recommendedCampaignsForCreator(
      creatorId,
      limit
    );
    if (rows.length === 0) {
      const fallback = await prisma.campaign.findMany({
        where: { status: "ACTIVE" },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, budgetMin: true, budgetMax: true, location: true },
      });
      return fallback;
    }
    return rows;
  } catch {
    return prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, budgetMin: true, budgetMax: true, location: true },
    });
  }
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { brand: { select: { id: true, brandProfile: true } } },
  });
  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function createCampaign(brandId: string, input: CreateCampaignInput) {
  const deadline = typeof input.deadline === "string" ? new Date(input.deadline) : input.deadline;
  const campaign = await prisma.campaign.create({
    data: {
      brandId,
      title: input.title,
      description: input.description,
      category: input.category,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      totalSlots: input.totalSlots,
      location: input.location,
      platforms: input.platforms,
      deliverables: input.deliverables,
      deadline,
      status: "DRAFT",
    },
  });
  try {
    await updateCampaignEmbedding(campaign.id);
  } catch (_) {}
  return campaign;
}

export async function updateCampaign(campaignId: string, brandId: string, input: UpdateCampaignInput) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId },
  });
  if (!campaign) throw new Error("Campaign not found");
  const deadline = input.deadline
    ? typeof input.deadline === "string"
      ? new Date(input.deadline)
      : input.deadline
    : undefined;
  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(input.title != null && { title: input.title }),
      ...(input.description != null && { description: input.description }),
      ...(input.category != null && { category: input.category }),
      ...(input.budgetMin != null && { budgetMin: input.budgetMin }),
      ...(input.budgetMax != null && { budgetMax: input.budgetMax }),
      ...(input.totalSlots != null && { totalSlots: input.totalSlots }),
      ...(input.location != null && { location: input.location }),
      ...(input.platforms != null && { platforms: input.platforms }),
      ...(input.deliverables != null && { deliverables: input.deliverables }),
      ...(deadline != null && { deadline }),
    },
  });
  try {
    await updateCampaignEmbedding(updated.id);
  } catch (_) {}
  return updated;
}

export async function closeCampaign(campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId },
  });
  if (!campaign) throw new Error("Campaign not found");
  return prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "CLOSED" },
  });
}
