import { prisma } from "../../db/client.js";
import type { UpdateProfileInput } from "./users.schemas.js";
import { getPresignedUploadUrl, buildPublicUrl } from "../../utils/s3.js";
import { updateCreatorEmbedding } from "../ai/embedding.service.js";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_MB = 50;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creatorProfile: true,
      brandProfile: true,
      organiserProfile: true,
    },
  });
  if (!user) throw new Error("User not found");
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { creatorProfile: true, brandProfile: true, organiserProfile: true },
  });
  if (!user) throw new Error("User not found");
  if (user.creatorProfile) {
    await prisma.creatorProfile.update({
      where: { userId },
      data: {
        ...(input.displayName != null && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.niche != null && { niche: input.niche }),
        ...(input.state != null && { state: input.state }),
        ...(input.socialHandle != null && { socialHandle: input.socialHandle }),
        ...(input.followerRange != null && { followerRange: input.followerRange }),
        ...(input.engagementRate !== undefined && { engagementRate: input.engagementRate }),
      },
    });
    try {
      await updateCreatorEmbedding(userId);
    } catch (_) {}
  }
  if (user.brandProfile) {
    await prisma.brandProfile.update({
      where: { userId },
      data: {
        ...(input.companyName != null && { companyName: input.companyName }),
        ...(input.founderName != null && { founderName: input.founderName }),
        ...(input.industry != null && { industry: input.industry }),
        ...(input.phone != null && { phone: input.phone }),
      },
    });
  }
  if (user.organiserProfile) {
    await prisma.organiserProfile.update({
      where: { userId },
      data: {
        ...(input.orgName != null && { orgName: input.orgName }),
        ...(input.contactName != null && { contactName: input.contactName }),
        ...(input.state != null && { state: input.state }),
        ...(input.phone != null && { phone: input.phone }),
      },
    });
  }
  return getMe(userId);
}

export async function getPresignedAvatarUrl(userId: string, contentType: string, key: string) {
  if (!ALLOWED_MIME.includes(contentType)) throw new Error("Invalid file type");
  const url = await getPresignedUploadUrl(key, contentType);
  return { uploadUrl: url, key };
}

export async function setAvatarUrl(userId: string, key: string) {
  const url = buildPublicUrl(key);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { creatorProfile: true, brandProfile: true, organiserProfile: true },
  });
  if (!user) throw new Error("User not found");
  if (user.creatorProfile) {
    await prisma.creatorProfile.update({ where: { userId }, data: { avatarUrl: url } });
  }
  if (user.brandProfile) {
    await prisma.brandProfile.update({ where: { userId }, data: { avatarUrl: url } });
  }
  if (user.organiserProfile) {
    await prisma.organiserProfile.update({ where: { userId }, data: { avatarUrl: url } });
  }
  return { avatarUrl: url };
}

export async function submitKyc(userId: string, docKey: string, docType: string) {
  const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!creator) throw new Error("Creator profile not found");
  await prisma.creatorProfile.update({
    where: { userId },
    data: { kycStatus: "SUBMITTED" },
  });
  return { message: "KYC submitted for review" };
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creatorProfile: true,
      brandProfile: true,
      organiserProfile: true,
    },
  });
  if (!user) throw new Error("User not found");
  const { passwordHash: _, email, ...safe } = user;
  return { ...safe, email: user.role === "ADMIN" ? undefined : email };
}
