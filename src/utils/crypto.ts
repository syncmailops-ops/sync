import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKeyAndIv(): { key: Buffer; iv: Buffer } {
  const env = getEnv();
  const key = Buffer.from(env.ENCRYPTION_KEY, "hex");
  if (key.length !== KEY_LEN) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  const iv = Buffer.from(env.ENCRYPTION_IV, "hex");
  if (iv.length !== IV_LEN) {
    throw new Error("ENCRYPTION_IV must be 12 bytes (24 hex chars)");
  }
  return { key, iv };
}

export function encrypt(plaintext: string): string {
  try {
    const { key, iv } = getKeyAndIv();
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([enc, tag]).toString("base64");
  } catch (err) {
    throw new Error("Encryption failed");
  }
}

export function decrypt(ciphertext: string): string {
  try {
    const { key, iv } = getKeyAndIv();
    const buf = Buffer.from(ciphertext, "base64");
    const tag = buf.subarray(buf.length - TAG_LEN);
    const enc = buf.subarray(0, buf.length - TAG_LEN);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  } catch {
    throw new Error("Decryption failed");
  }
}

export function generateIv(): string {
  return randomBytes(IV_LEN).toString("hex");
}
