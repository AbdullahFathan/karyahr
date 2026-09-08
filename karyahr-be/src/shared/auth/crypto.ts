import { createHash, randomBytes } from "node:crypto";

/**
 * Hashes a password with argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

/**
 * Verifies a password against an argon2id hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

/**
 * Generates a raw refresh token and its SHA-256 hash.
 */
export function generateRefreshToken(): { readonly raw: string; readonly hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashRefreshToken(raw) };
}

/**
 * Hashes a raw refresh token for storage.
 */
export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
