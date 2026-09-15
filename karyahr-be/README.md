# KaryaHR backend

REST API untuk KaryaHR: domain HR, persistence, file storage, dan background jobs.

Runtime **Bun**. HTTP **Express**. ORM **Prisma** (PostgreSQL). Antrian **BullMQ** (Redis). Object storage **MinIO**.

Ikhtisar seluruh repo: [`../Readme.md`](../Readme.md). UI: [`../karyahr-fe`](../karyahr-fe).

## Stack

| Layer | Teknologi |
|---|---|
| Runtime | Bun |
| HTTP | Express 5, Helmet, CORS (`credentials: true`), rate limit |
| Validasi | Zod di `presentation` saja |
| Data | Prisma 7 + PostgreSQL (`pg` adapter) |
| Jobs | Redis + BullMQ (`notifications`, `leave-accrual`, `payroll`) |
| File | MinIO; body object dienkripsi AES-256-GCM |
| Auth | JWT di HTTP-only cookie + refresh token |
| Docs | `/openapi.json` dan `/docs` jika `NODE_ENV` bukan `production` |
| Log | Pino |

## Arsitektur

Modular monolith + Clean Architecture per fitur. Arah dependensi: **presentation → domain ← data**. Domain tidak mengimpor Express, Prisma, atau Zod.

```
src/
  server.ts              HTTP process
  worker.ts              BullMQ workers
  app.ts                 middleware + mount routes
  config/                env, Redis, storage, mail
  modules/<feature>/
    domain/              entities, repository interfaces, use cases
    data/                Prisma repositories, adapters
    presentation/        controllers, routes, Zod schemas, OpenAPI
  shared/                auth, crypto, middleware, queue, audit
prisma/
  schema.prisma
  migrations/
  seed.ts
```

Modul di `src/modules/`: `auth`, `organization`, `employees`, `attendance`, `leave`, `notifications`, `payroll`, `recruitment` (termasuk onboarding), `performance`, `system`.

## Prasyarat

- [Bun](https://bun.sh)
- Docker (Compose untuk Postgres, Redis, MinIO)

## Infrastruktur

```bash
docker compose up -d
```

Default host ports:

| Layanan | Port |
|---|---|
| PostgreSQL | `5433` → container `5432` |
| Redis | `6379` |
| MinIO API | `9000` |
| MinIO console | `9001` |

`DATABASE_URL` harus memakai port host Postgres (contoh `5433`), bukan `5432`, kecuali Anda mengubah mapping di Compose.

## Setup

```bash
cp .env.example .env.local
# Isi nilai di bawah. Jangan commit .env.local.
bun install
bun run prisma:migrate
bun run prisma:seed
bun run dev
```

API default: `http://localhost:3000`.

Worker (email notifikasi, leave accrual, payroll) proses terpisah:

```bash
bun run worker
# atau watch: bun run worker:dev
```

### Env wajib

Salin dari `.env.example`. Script Bun memakai `--env-file=.env.local`.

| Variabel | Catatan |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis |
| `JWT_SECRET` | Minimal 32 karakter |
| `ENCRYPTION_KEY` | **32 byte dalam Base64** (AES-256-GCM) |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Object storage |
| `CORS_ORIGIN` | Origin frontend, default `http://localhost:5173`. Production: allowlist eksplisit, bukan `*` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Wajib untuk `prisma:seed` (password min. 8 karakter) |

`ENCRYPTION_KEY` mengenkripsi jumlah gaji, PII payroll, dan body object MinIO. Baris/objek plaintext lama tetap bisa dibaca sampai ditulis ulang (re-seed atau simpan ulang).

Contoh generate kunci 32-byte Base64:

```bash
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
```

SMTP opsional. Kosongkan `SMTP_*` untuk mailer noop di lokal.

Production: `COOKIE_SECURE=true` dan `CORS_ORIGIN` bukan wildcard.

## Endpoint berguna

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Postgres + Redis |
| `GET` | `/system/ping` | Ping modul system |
| `POST` | `/auth/login` | Session cookie |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Hapus session |
| `GET` | `/auth/me` | User + permissions (butuh auth) |
| `GET` | `/careers` | Lowongan publik |
| `GET` | `/docs` | Swagger UI (non-production) |
| `GET` | `/openapi.json` | Spec OpenAPI (non-production) |

Prefix API lain mengikuti modul: `/employees`, `/org`, `/attendance`, `/leave`, `/payroll`, `/recruitment`, `/onboarding`, `/performance`, `/notifications`, `/roles`.

Auth memakai cookie HTTP-only. Klien harus mengirim credentials (frontend: Axios `withCredentials: true`).

Seed membuat permission catalog, role `hr_admin` / `manager` / `recruiter` / `employee`, dan satu user HR admin dari env seed.

## Scripts

| Script | Fungsi |
|---|---|
| `bun run dev` | API + watch |
| `bun run start` | API tanpa watch |
| `bun run worker` | BullMQ workers |
| `bun run worker:dev` | Workers + watch |
| `bun test` | Unit test di `src/` |
| `bun run test:coverage` | Coverage + assert use case tests |
| `bun run test:e2e` | E2E (butuh DB/env; `SKIP_API_RATE_LIMIT=1`) |
| `bun run prisma:migrate` | `prisma migrate dev` |
| `bun run prisma:generate` | Generate client |
| `bun run prisma:push` | `db push` (dev schema saja) |
| `bun run prisma:seed` | Seed RBAC + admin |

## Tes

```bash
bun test                 # unit
bun run test:coverage    # coverage + use case coverage gate
bun run test:e2e         # e2e/ (infra + .env.local)
```
