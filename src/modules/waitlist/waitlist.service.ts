import { prisma } from "../../db/client.js";
import type { JoinWaitlistInput } from "./waitlist.schemas.js";

export async function join(input: JoinWaitlistInput) {
  try {
    await prisma.waitlist.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        role: input.role,
        name: input.name ?? null,
      },
      update: {
        role: input.role,
        name: input.name ?? null,
      },
    });
    return { message: "Joined waitlist" };
  } catch (err) {
    throw new Error("Failed to join waitlist");
  }
}
