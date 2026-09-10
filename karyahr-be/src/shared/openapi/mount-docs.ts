import { createRequire } from "node:module";
import { dirname } from "node:path";
import express from "express";
import type { Express } from "express";
import { buildOpenApiDocument } from "./document";

const require = createRequire(import.meta.url);
const swaggerUiAssetPath = dirname(require.resolve("swagger-ui-dist/package.json"));

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KaryaHR API</title>
    <link rel="stylesheet" href="/docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        withCredentials: true,
      });
    </script>
  </body>
</html>
`;

/**
 * Returns true when OpenAPI JSON and Swagger UI should be mounted.
 */
export function shouldServeOpenApiDocs(nodeEnv: string): boolean {
  return nodeEnv !== "production";
}

/**
 * Serves GET /openapi.json and GET /docs (Swagger UI) on a non-production app.
 */
export function mountOpenApiDocs(app: Express): void {
  app.get("/openapi.json", (_req, res) => {
    res.status(200).json(buildOpenApiDocument());
  });

  app.get("/docs", (_req, res) => {
    res.removeHeader("Content-Security-Policy");
    res
      .setHeader(
        "Content-Security-Policy",
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:",
      )
      .type("html")
      .send(SWAGGER_HTML);
  });

  app.use("/docs", (_req, res, next) => {
    res.removeHeader("Content-Security-Policy");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:",
    );
    next();
  });
  app.use("/docs", express.static(swaggerUiAssetPath, { index: false }));
}

/**
 * True when the request should skip the global API rate limiter.
 */
export function isOpenApiDocsPath(path: string): boolean {
  return path === "/openapi.json" || path === "/docs" || path.startsWith("/docs/");
}
