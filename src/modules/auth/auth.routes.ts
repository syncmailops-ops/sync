import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import * as authService from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

const REFRESH_COOKIE = "refreshToken";
const COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 7 * 24 * 60 * 60, path: "/api/auth" };

export async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post(
    "/register",
    {
      schema: {
        body: { type: "object", required: ["role"], properties: { role: { type: "string" }, email: { type: "string" }, password: { type: "string" } } },
        response: {
          201: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  role: { type: "string" },
                  message: { type: "string" },
                },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send({ data: result, message: result.message });
    }
  );

  app.post(
    "/login",
    {
      schema: {
        body: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } },
        response: { 200: { type: "object", properties: { data: { type: "object", properties: { accessToken: { type: "string" }, expiresIn: { type: "number" } } } } } },
      },
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
      reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
      await reply.send({ data: { accessToken: result.accessToken, expiresIn: result.expiresIn }, message: "Logged in" });
    }
  );

  app.post(
    "/refresh",
    {
      schema: {
        response: { 200: { type: "object", properties: { data: { type: "object", properties: { accessToken: { type: "string" }, expiresIn: { type: "number" } } } } } },
      },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (!token) {
        return reply.status(401).send({ error: "Unauthorized", message: "Missing refresh token", statusCode: 401 });
      }
      const result = await authService.refresh(token);
      await reply.send({ data: result, message: "Token refreshed" });
    }
  );

  app.post(
    "/logout",
    {
      schema: { response: { 200: { type: "object", properties: { message: { type: "string" } } } } },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (token) await authService.logout(token);
      reply.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
      await reply.send({ message: "Logged out" });
    }
  );

  app.post(
    "/verify-email",
    {
      schema: {
        body: { type: "object", required: ["token"], properties: { token: { type: "string" } } },
        response: { 200: { type: "object", properties: { message: { type: "string" } } } },
      },
    },
    async (request, reply) => {
      const body = verifyEmailSchema.parse(request.body);
      const result = await authService.verifyEmail(body);
      await reply.send(result);
    }
  );

  app.post(
    "/forgot-password",
    {
      schema: {
        body: { type: "object", required: ["email"], properties: { email: { type: "string" } } },
        response: { 200: { type: "object", properties: { message: { type: "string" } } } },
      },
    },
    async (request, reply) => {
      const body = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(body);
      await reply.send(result);
    }
  );

  app.post(
    "/reset-password",
    {
      schema: {
        body: { type: "object", required: ["token", "password"], properties: { token: { type: "string" }, password: { type: "string" } } },
        response: { 200: { type: "object", properties: { message: { type: "string" } } } },
      },
    },
    async (request, reply) => {
      const body = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(body);
      await reply.send(result);
    }
  );
}
