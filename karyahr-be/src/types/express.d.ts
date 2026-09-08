import type { AuthContext } from "../auth/auth-context";

declare global {
  namespace Express {
    interface Request {
      cookies: Record<string, string | undefined>;
      auth?: AuthContext;
    }
  }
}

export {};
