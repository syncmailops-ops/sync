import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

const prismaCodeToStatus: Record<string, number> = {
  P2002: 409, // unique constraint
  P2025: 404, // record not found
};

export async function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const log = reply.log;

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    const errors = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    await reply.status(400).send({
      error: "ValidationError",
      message,
      errors,
      statusCode: 400,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const statusCode = prismaCodeToStatus[error.code] ?? 400;
    let message: string;
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.[0];
      message =
        target === "email"
          ? "This email is already registered. Try logging in or use a different email."
          : "A record with this value already exists.";
    } else if (error.code === "P2025") {
      message = "Record not found.";
    } else {
      message = error.message;
    }
    log.warn({ code: error.code, meta: error.meta }, "Prisma error");
    await reply.status(statusCode).send({
      error: "PrismaError",
      message,
      statusCode,
    });
    return;
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  if (statusCode >= 500) {
    log.error({ err: error }, error.message);
  }
  await reply.status(statusCode).send({
    error: error.name ?? "InternalServerError",
    message: statusCode >= 500 ? "Internal server error" : error.message,
    statusCode,
  });
}
