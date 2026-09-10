# karyahr-be

Backend for KaryaHR (Bun + Express + Prisma).

## Setup

```bash
bun install
cp .env.example .env.local
# Fill DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY (32-byte base64), MinIO, etc.
bun run prisma:migrate
bun run prisma:seed
bun run dev
```

`ENCRYPTION_KEY` is required (AES-256-GCM). Salary amounts, payroll PII, and MinIO object bodies are encrypted at rest. Legacy plaintext rows/objects dual-read until rewritten (re-seed or re-save to overwrite).

In non-production (`NODE_ENV` is not `production`), OpenAPI is served at `/openapi.json` and Swagger UI at `/docs`.

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | API with watch |
| `bun run worker` | BullMQ workers |
| `bun test` | Unit tests |
| `bun run prisma:migrate` | Apply migrations |
| `bun run prisma:seed` | Seed data |
