import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";

describe("Escrow", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://sync:sync_secret@localhost:5432/sync_db";
    process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
    process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ?? "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcdP4kEoE2rE5VlW9L8x7K2mN3pQ4rS6tU7vW8x\n-----END RSA PRIVATE KEY-----";
    process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ?? "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcdP4kEoE2rE5\n-----END PUBLIC KEY-----";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "a".repeat(32);
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "0".repeat(64);
    process.env.ENCRYPTION_IV = process.env.ENCRYPTION_IV ?? "0".repeat(24);
    process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/escrow/webhook without signature returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/escrow/webhook",
      payload: { event: "payment.captured" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/escrow/create without auth returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/escrow/create",
      payload: { contractId: "clxx" },
    });
    expect(res.statusCode).toBe(401);
  });
});
