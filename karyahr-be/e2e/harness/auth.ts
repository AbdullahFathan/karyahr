import { env } from "../../src/config/env";
import { CookieClient } from "./http";

export type LoginUser = {
  readonly id: string;
  readonly email: string;
  readonly employeeId: string;
};

/**
 * Logs in with the seeded HR admin credentials.
 */
export async function loginAsAdmin(baseUrl: string): Promise<CookieClient> {
  const config = env();
  const email = config.SEED_ADMIN_EMAIL;
  const password = config.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set for E2E");
  }
  const client = new CookieClient(baseUrl);
  await login(client, email, password);
  return client;
}

/**
 * Logs in with email and password, storing session cookies on the client.
 */
export async function login(client: CookieClient, email: string, password: string): Promise<LoginUser> {
  const response = await client.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${await response.text()}`);
  }
  const body = (await response.json()) as { user: LoginUser };
  return body.user;
}

/**
 * Attempts login and returns the raw response (for unauthorized assertions).
 */
export function attemptLogin(
  client: CookieClient,
  email: string,
  password: string,
): Promise<Response> {
  return client.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
