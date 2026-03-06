import { prisma } from "../../db/client.js";

export async function getCreatorAnalytics(userId: string) {
  const [earnings, campaignsCompleted, reviews] = await Promise.all([
    prisma.escrow.aggregate({
      where: { contract: { creatorId: userId }, status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.contract.count({
      where: { creatorId: userId },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  return {
    totalEarnings: Number(earnings._sum.amount ?? 0),
    campaignsCompleted,
    avgRating: reviews._count ? Number(reviews._avg.rating ?? 0) : null,
    reviewCount: reviews._count,
  };
}

export async function getBrandAnalytics(userId: string) {
  const [spend, campaignsRun, creatorCount, completed] = await Promise.all([
    prisma.escrow.aggregate({
      where: { contract: { brandId: userId }, status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.campaign.count({ where: { brandId: userId } }),
    prisma.application.count({
      where: { campaign: { brandId: userId }, status: "ACCEPTED" },
    }),
    prisma.contract.count({
      where: { brandId: userId },
    }),
  ]);
  const total = await prisma.contract.count({ where: { brandId: userId } });
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  return {
    totalSpend: Number(spend._sum.amount ?? 0),
    campaignsRun,
    creatorCount,
    completionRate,
  };
}

export async function getAdminAnalytics() {
  const [users, gmv, activeCampaigns] = await Promise.all([
    prisma.user.count(),
    prisma.escrow.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
  ]);
  return {
    totalUsers: users,
    totalGMV: Number(gmv._sum.amount ?? 0),
    activeCampaigns,
  };
}
