import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "../../db/client.js";
import type { CreateContractInput } from "./contracts.schemas.js";
import { getEnv } from "../../config/env.js";
import { notificationService } from "../notifications/notifications.service.js";

async function uploadPdfToS3(key: string, buffer: Uint8Array): Promise<string> {
  const env = getEnv();
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("S3 not configured");
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    })
  );
  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function createContract(brandId: string, input: CreateContractInput) {
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: { campaign: true },
  });
  if (!application || application.campaign.brandId !== brandId) {
    throw new Error("Application not found");
  }
  if (application.status !== "ACCEPTED") {
    throw new Error("Application must be ACCEPTED to create contract");
  }
  const existing = await prisma.contract.findUnique({
    where: { applicationId: input.applicationId },
  });
  if (existing) throw new Error("Contract already exists for this application");

  const contract = await prisma.contract.create({
    data: {
      applicationId: input.applicationId,
      creatorId: application.creatorId,
      brandId,
      terms: input.terms,
      agreedRate: input.agreedRate,
    },
  });

  await notificationService.create(
    application.creatorId,
    "contract_created",
    "Contract created",
    "A contract has been created for your accepted application."
  );

  return contract;
}

export async function getContractById(id: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { application: { include: { campaign: true } }, escrow: true },
  });
  if (!contract) throw new Error("Contract not found");
  if (contract.creatorId !== userId && contract.brandId !== userId) {
    throw new Error("Contract not found");
  }
  return contract;
}

export async function signContract(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { application: true },
  });
  if (!contract) throw new Error("Contract not found");

  const isBrand = contract.brandId === userId;
  const isCreator = contract.creatorId === userId;
  if (!isBrand && !isCreator) throw new Error("Contract not found");

  const updates: { signedByBrand?: boolean; signedByCreator?: boolean; signedAt?: Date } = {};
  if (isBrand) updates.signedByBrand = true;
  if (isCreator) updates.signedByCreator = true;

  const bothSigned =
    (isBrand && contract.signedByCreator) || (isCreator && contract.signedByBrand);
  if (bothSigned) {
    updates.signedAt = new Date();
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: updates,
  });

  if (updated.signedByBrand && updated.signedByCreator && !updated.pdfUrl) {
    const pdfBuffer = await generateContractPdf(updated);
    const key = `contracts/${contractId}.pdf`;
    const pdfUrl = await uploadPdfToS3(key, pdfBuffer);
    await prisma.contract.update({
      where: { id: contractId },
      data: { pdfUrl },
    });
    const escrowModule = await import("../escrow/escrow.service.js");
    await escrowModule.createEscrowForContract(contractId);
    await notificationService.create(
      contract.creatorId,
      "contract_signed",
      "Contract signed",
      "Both parties have signed. Escrow has been initiated."
    );
    await notificationService.create(
      contract.brandId,
      "contract_signed",
      "Contract signed",
      "Both parties have signed. Please complete payment to hold funds in escrow."
    );
  }

  return prisma.contract.findUnique({
    where: { id: contractId },
    include: { escrow: true },
  });
}

async function generateContractPdf(contract: {
  id: string;
  terms: string;
  agreedRate: unknown;
  signedAt: Date | null;
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  const margin = 50;
  let y = 800;
  page.drawText("Sync - Contract", {
    x: margin,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 30;
  page.drawText(`Agreed rate: ₹${contract.agreedRate}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 20;
  const termsLines = contract.terms.split("\n").slice(0, 40);
  for (const line of termsLines) {
    if (y < 100) break;
    page.drawText(line.slice(0, 90), {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
  }
  if (contract.signedAt) {
    page.drawText(`Signed on: ${contract.signedAt.toISOString().slice(0, 10)}`, {
      x: margin,
      y: 80,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  return doc.save();
}

export async function getContractPdfUrl(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });
  if (!contract || (contract.creatorId !== userId && contract.brandId !== userId)) {
    throw new Error("Contract not found");
  }
  if (!contract.pdfUrl) throw new Error("Contract not yet signed by both parties");
  return { url: contract.pdfUrl };
}
