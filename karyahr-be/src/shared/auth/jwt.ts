import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env";

export type AccessTokenPayload = {
  readonly userId: string;
  readonly employeeId: string;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env().JWT_SECRET);
}

/**
 * Signs a short-lived access JWT.
 */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ employeeId: payload.employeeId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${env().JWT_ACCESS_TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies an access JWT and returns its payload.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey());
  const userId = payload.sub;
  const employeeId = payload.employeeId;
  if (!userId || typeof employeeId !== "string") {
    throw new Error("Invalid access token payload");
  }
  return { userId, employeeId };
}
