# KaryaHR

KaryaHR adalah aplikasi HRIS (Human Resource Information System) untuk operasional HR sehari-hari: data karyawan, organisasi, absensi, cuti, payroll, rekrutmen, onboarding, dan kinerja.

Repo ini berisi dua aplikasi yang dijalankan terpisah:

| Folder | Peran | Runtime |
|---|---|---|
| [`karyahr-be`](./karyahr-be) | REST API, domain logic, persistence, jobs | Bun + Express |
| [`karyahr-fe`](./karyahr-fe) | UI web (HR admin, manager, recruiter, ESS, career site) | Bun + Vite + React |

Frontend memanggil backend secara langsung (tanpa Vite proxy). Autentikasi memakai **HTTP-only cookies** (`withCredentials: true`). CORS backend harus mengizinkan origin frontend, misalnya `http://localhost:5173`.

```
Browser (karyahr-fe :5173)
        │  Axios + cookies
        ▼
API (karyahr-be :3000)
        │
        ├── PostgreSQL  (Prisma)
        ├── Redis       (sesi cache / BullMQ)
        └── MinIO       (dokumen & file terenkripsi)
```

## Fitur

| Area | Backend (`karyahr-be/src/modules`) | Frontend (`karyahr-fe/src/features`) |
|---|---|---|
| Auth & RBAC | `auth` | `auth`, `roles` |
| Organisasi | `organization` | `organization` |
| Karyawan | `employees` | `employees`, `profile` |
| Absensi & shift | `attendance` | `attendance` |
| Cuti | `leave` | `leave` |
| Notifikasi | `notifications` | `notifications` |
| Payroll & payslip | `payroll` | `payroll` |
| Rekrutmen & onboarding | `recruitment` | `recruitment`, `onboarding` |
| Kinerja (goals, review, cycle) | `performance` | `performance` |
| Health / ping | `system` | dashboard memakai data modul di atas |

Portal karir publik ada di `/careers` (tanpa login). Sisa aplikasi di belakang login dan permission.

Role seed: `hr_admin`, `manager`, `recruiter`, `employee`.

## Stack

### Backend (`karyahr-be`)

- **Runtime:** Bun
- **HTTP:** Express.js
- **Bahasa:** TypeScript
- **ORM / DB:** Prisma + PostgreSQL
- **Antrian:** Redis + BullMQ (`bun run worker`)
- **Storage:** MinIO (body object dienkripsi)
- **Validasi:** Zod (hanya di presentation)
- **Auth:** JWT di cookie, permission per route
- **Lain:** Helmet, CORS credentials, rate limit, Nodemailer, PDFKit, OpenAPI/Swagger di non-production (`/docs`, `/openapi.json`)

Arsitektur per modul: **Clean Architecture** (`presentation` → `domain` ← `data`). Domain tidak mengimpor Express, Prisma, atau Zod.

```
src/modules/<feature>/
  domain/        entities, repository interfaces, use cases
  data/          Prisma repositories, adapters
  presentation/  controllers, routes, Zod schemas, OpenAPI
```

Konfigurasi Redis, queue, email, dan env ada di `src/config/`. Data sensitif (gaji, PII payroll, file MinIO) dienkripsi at rest dengan AES-256-GCM (`ENCRYPTION_KEY`).

### Frontend (`karyahr-fe`)

- **Runtime:** Bun
- **UI:** React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Data:** TanStack Query + Axios
- **Routing:** React Router
- **Form/validasi:** Zod

Struktur UI mengikuti feature folder (`src/features/<nama>`): pages, hooks, API client, schema. Route guard memakai permission yang sama dengan backend (`src/lib/permissions.ts`).

## Prasyarat

- [Bun](https://bun.sh)
- Docker (PostgreSQL, Redis, MinIO lewat Compose)
- Salin env backend dan frontend. **Jangan commit password.**

## Menjalankan lokal

### 1. Infrastruktur

Dari `karyahr-be` (file `docker-compose.yml`):

```bash
cd karyahr-be
docker compose up -d
```

Layanan default:

- PostgreSQL: port `5433` (host) → `5432` (container)
- Redis: `6379`
- MinIO API: `9000`, console: `9001`

### 2. Backend

```bash
cd karyahr-be
cp .env.example .env.local
# Isi DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY (32-byte base64),
# MinIO, CORS_ORIGIN=http://localhost:5173, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
bun install
bun run prisma:migrate
bun run prisma:seed
bun run dev
```

API default: `http://localhost:3000`. Health: `GET /health`.

Worker terpisah (email, payroll export, jobs lain):

```bash
bun run worker
```

Script berguna:

| Script | Fungsi |
|---|---|
| `bun run dev` | API + watch |
| `bun run worker` | BullMQ workers |
| `bun test` | Unit test |
| `bun run prisma:migrate` | Migrasi |
| `bun run prisma:seed` | Seed RBAC + admin |

SMTP opsional. Kosongkan variabel SMTP untuk mailer noop di lokal.

### 3. Frontend

```bash
cd karyahr-fe
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3000
bun install
bun run dev
```

UI: `http://localhost:5173`. Login di `/login` (email + password seed). Session dari `POST /auth/login`, bootstrap dari `GET /auth/me`.

| Script | Fungsi |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | `tsc -b` + Vite production build |
| `bun run lint` | ESLint |
| `bun run preview` | Preview hasil build |

## Integrasi FE ↔ BE

1. Set `CORS_ORIGIN` backend ke origin Vite (`http://localhost:5173`).
2. Set `VITE_API_BASE_URL` frontend ke origin API.
3. Cookie session butuh `credentials: true` di CORS dan Axios `withCredentials`.
4. Izin layar mengikuti permission string yang sama di kedua sisi.
5. Upload file lewat API, disimpan di MinIO (bukan di folder frontend).

Detail tambahan: [`karyahr-be/README.md`](./karyahr-be/README.md) dan [`karyahr-fe/README.md`](./karyahr-fe/README.md).
