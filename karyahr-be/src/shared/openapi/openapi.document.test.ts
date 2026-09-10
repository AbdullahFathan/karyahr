import { describe, expect, test } from "bun:test";
import express from "express";
import { buildOpenApiDocument } from "./document";
import { isOpenApiDocsPath, mountOpenApiDocs, shouldServeOpenApiDocs } from "./mount-docs";

const requiredPaths = [
  "/auth/login",
  "/auth/me",
  "/employees/{id}/offboard",
  "/attendance/check-in",
  "/leave/requests",
  "/payroll/runs",
  "/payslips/me",
  "/recruitment/jobs",
  "/performance/goals",
  "/onboarding/dashboard",
] as const;

describe("buildOpenApiDocument", () => {
  test("returns OpenAPI 3.0.3 with cookie auth and Error schema", () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe("3.0.3");
    const errorSchema = doc.components.schemas.Error;
    expect(errorSchema).toBeDefined();
    const properties = errorSchema?.properties as Record<string, unknown> | undefined;
    expect(properties?.error).toBeDefined();
    expect(properties?.message).toBeDefined();
    expect(doc.components.securitySchemes.cookieAuth).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "access_token",
    });
  });

  test("covers Phase 1–5 and offboard paths", () => {
    const doc = buildOpenApiDocument();
    for (const path of requiredPaths) {
      expect(doc.paths[path], path).toBeDefined();
    }
    expect(doc.paths["/employees/{id}/offboard"]?.post).toBeDefined();
  });
});

describe("shouldServeOpenApiDocs", () => {
  test("is enabled outside production", () => {
    expect(shouldServeOpenApiDocs("development")).toBe(true);
    expect(shouldServeOpenApiDocs("test")).toBe(true);
    expect(shouldServeOpenApiDocs("production")).toBe(false);
  });
});

describe("isOpenApiDocsPath", () => {
  test("matches spec and swagger assets", () => {
    expect(isOpenApiDocsPath("/openapi.json")).toBe(true);
    expect(isOpenApiDocsPath("/docs")).toBe(true);
    expect(isOpenApiDocsPath("/docs/swagger-ui.css")).toBe(true);
    expect(isOpenApiDocsPath("/health")).toBe(false);
  });
});

describe("mountOpenApiDocs", () => {
  test("serves JSON spec and HTML UI", async () => {
    const app = express();
    mountOpenApiDocs(app);
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("expected TCP port");
      }
      const base = `http://127.0.0.1:${address.port}`;
      const specRes = await fetch(`${base}/openapi.json`);
      expect(specRes.status).toBe(200);
      const spec = (await specRes.json()) as { openapi?: string };
      expect(spec.openapi).toBe("3.0.3");

      const docsRes = await fetch(`${base}/docs`);
      expect(docsRes.status).toBe(200);
      const html = await docsRes.text();
      expect(html).toContain("swagger-ui");
      expect(html).toContain("/openapi.json");
    } finally {
      server.close();
    }
  });
});
