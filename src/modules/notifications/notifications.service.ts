import { prisma } from "../../db/client.js";

export async function create(
  userId: string,
  type: string,
  title: string,
  body: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body },
    });
  } catch (err) {
    throw new Error("Failed to create notification");
  }
}

export const notificationService = {
  create,
};
