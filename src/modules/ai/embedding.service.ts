import OpenAI from "openai";
import { getEnv } from "../../config/env.js";
import { prisma } from "../../db/client.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const key = getEnv().OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not configured");
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
}

export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    dimensions: DIMENSIONS,
  });
  const vector = response.data[0]?.embedding;
  if (!vector || vector.length !== DIMENSIONS) {
    throw new Error("Invalid embedding response");
  }
  return vector;
}

export async function updateCreatorEmbedding(userId: string): Promise<void> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId },
  });
  if (!creator) throw new Error("Creator profile not found");
  const text = [creator.bio, creator.niche, creator.state].filter(Boolean).join(" ");
  if (!text) return;
  const vector = await embedText(text);
  const vecStr = "[" + vector.join(",") + "]";
  await prisma.$executeRawUnsafe(
    `UPDATE "CreatorProfile" SET embedding = $1::vector WHERE "userId" = $2`,
    vecStr,
    userId
  );
}

export async function updateCampaignEmbedding(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");
  const text = [campaign.title, campaign.description, campaign.deliverables].join(" ");
  const vector = await embedText(text);
  const vecStr = "[" + vector.join(",") + "]";
  await prisma.$executeRawUnsafe(
    `UPDATE "Campaign" SET embedding = $1::vector WHERE id = $2`,
    vecStr,
    campaignId
  );
}

export async function recommendedCampaignsForCreator(
  creatorUserId: string,
  limit: number
): Promise<{ id: string; title: string; budgetMin: unknown; budgetMax: unknown; location: string }[]> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: creatorUserId },
  });
  if (!creator) return [];
  const result = await prisma.$queryRawUnsafe<
    { id: string; title: string; budgetMin: unknown; budgetMax: unknown; location: string }[]
  >(
    `SELECT c.id, c.title, c."budgetMin", c."budgetMax", c.location
     FROM "Campaign" c
     WHERE c.status = 'ACTIVE' AND c.embedding IS NOT NULL
     ORDER BY c.embedding <=> (SELECT embedding FROM "CreatorProfile" WHERE "userId" = $1 LIMIT 1)
     LIMIT $2`,
    creatorUserId,
    limit
  );
  return result ?? [];
}
