import { prisma } from "../../db/client.js";
import type { JoinWaitlistInput } from "./waitlist.schemas.js";

export async function join(input: JoinWaitlistInput) {
  try {
    const existing = await prisma.waitlist.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      return { message: "Already on waitlist" };
    }

    await prisma.waitlist.create({
      data: {
        email: input.email,
        role: input.role,
        name: input.name ?? null,
      },
    });

    return { message: "Joined waitlist" };
  } catch (err) {
    throw new Error("Failed to join waitlist");
  }
}
