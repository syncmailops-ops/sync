import { FastifyRequest, FastifyReply } from "fastify";

type Role = "CREATOR" | "BRAND" | "ORGANISER" | "ADMIN";

export function roleGuard(...allowedRoles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      const err = new Error("Authentication required") as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    if (!allowedRoles.includes(user.role as Role)) {
      const err = new Error("Insufficient permissions") as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }
  };
}
