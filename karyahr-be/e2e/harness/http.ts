export type ApiErrorBody = {
  readonly error: string;
  readonly message: string;
  readonly requestId?: string;
};

/**
 * Cookie-aware HTTP client for in-process E2E requests.
 */
export class CookieClient {
  readonly cookies = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  /**
   * Sends a request, storing Set-Cookie values for later calls.
   */
  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookies.size > 0 && !headers.has("Cookie")) {
      headers.set("Cookie", serializeCookies(this.cookies));
    }
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    applySetCookie(this.cookies, response);
    return response;
  }

  json<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request(path, init).then(async (response) => {
      return (await response.json()) as T;
    });
  }
}

/**
 * Builds a client with no cookies.
 */
export function anonymousClient(baseUrl: string): CookieClient {
  return new CookieClient(baseUrl);
}

function serializeCookies(cookies: Map<string, string>): string {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function applySetCookie(cookies: Map<string, string>, response: Response): void {
  const headers = response.headers.getSetCookie();
  for (const header of headers) {
    const pair = header.split(";", 1)[0];
    if (!pair) {
      continue;
    }
    const separator = pair.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value.length === 0) {
      cookies.delete(name);
      continue;
    }
    cookies.set(name, value);
  }
}
