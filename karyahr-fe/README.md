# KaryaHR frontend

Aplikasi web KaryaHR: HR admin, manager, recruiter, employee self-service (ESS), dan portal karir publik.

React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui. Runtime **Bun**. Data lewat TanStack Query dan Axios.

Ikhtisar seluruh repo: [`../Readme.md`](../Readme.md). API: [`../karyahr-be`](../karyahr-be).

Tidak ada Vite proxy. Browser memanggil API langsung. Cookie session memakai `withCredentials: true`.

## Stack

| Layer | Teknologi |
|---|---|
| Runtime | Bun |
| UI | React 19, Vite 8, Tailwind 4, shadcn/ui, Radix, Lucide |
| Routing | React Router 7 |
| Data | TanStack Query, Axios |
| Validasi | Zod |

## Struktur

```
src/
  app/                 entry, router, layouts, providers
  components/ui/       shadcn
  components/common/   sidebar, navbar, pagination
  features/<nama>/     pages, hooks, api, schema
  lib/                 env, permissions, auth helpers, upload allowlist
  services/api/        Axios client + interceptors
```

Setiap fitur biasanya: `pages/`, `hooks/`, `api/`, plus `schema.ts` / `types.ts` bila perlu.

Fitur: `auth`, `dashboard`, `profile`, `employees`, `organization`, `roles`, `attendance`, `leave`, `payroll`, `recruitment`, `onboarding`, `performance`, `notifications`.

Route guard memakai permission yang sama dengan backend (`src/lib/permissions.ts`). Sidebar menyembunyikan item tanpa izin.

## Prasyarat

- [Bun](https://bun.sh)
- Backend berjalan (lihat [`karyahr-be/README.md`](../karyahr-be/README.md))

## Setup

```bash
cp .env.example .env
bun install
bun run dev
```

Dev server: **http://localhost:5173** (`vite.config.ts`).

### Env

| Variabel | Default | Fungsi |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Origin API |

Di backend, `CORS_ORIGIN` harus berisi origin Vite, misalnya:

```
CORS_ORIGIN=http://localhost:5173
```

Tanpa itu, login gagal karena cookie cross-origin ditolak.

## Scripts

Tidak ada script `typecheck` terpisah. Typecheck jalan di `build` (`tsc -b && vite build`).

| Script | Fungsi |
|---|---|
| `bun run dev` | Vite, http://localhost:5173 |
| `bun run build` | Typecheck + production bundle |
| `bun run preview` | Preview hasil build |
| `bun run lint` | ESLint |

## Auth

1. Buka `/login`.
2. `POST /auth/login` set cookie session.
3. `GET /auth/me` mengisi user, role, dan permissions.
4. Guard: `RequireAuth`, `RequirePermission`, `RequireAnyPermission`, `GuestOnly`.

Seed backend membuat satu HR admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` di `.env.local` backend). **Jangan taruh password di repo ini.**

Role lain (`manager`, `recruiter`, `employee`) di-assign di backend. Seed tidak membuat akun ESS/recruiter siap pakai selain admin.

Cek API hidup: `GET http://localhost:3000/health`.

## Rute utama

Publik (tanpa login):

| Path | Halaman |
|---|---|
| `/careers` | Daftar lowongan |
| `/careers/:slug` | Detail lowongan |
| `/careers/:slug/apply` | Lamar |

Setelah login (contoh; tampilan tergantung permission):

| Path | Halaman |
|---|---|
| `/` | Dashboard |
| `/me` | Profil ESS |
| `/employees` | Karyawan |
| `/org/departments`, `/org/positions`, `/org/tree` | Organisasi |
| `/attendance`, `/attendance/me`, `/attendance/dashboard`, `/attendance/shifts` | Absensi |
| `/leave`, `/leave/new`, `/leave/inbox` | Cuti |
| `/payroll/runs`, `/payslips` | Payroll |
| `/recruitment/jobs` | Rekrutmen |
| `/onboarding`, `/onboarding/me` | Onboarding |
| `/performance/goals`, `/performance/me`, `/performance/cycles` | Kinerja |
| `/notifications` | Notifikasi |
| `/admin/roles` | Role & permission |

Definisi lengkap: `src/app/router.tsx`.

## Integrasi API

- Client: `src/services/api/client.ts` — `baseURL` dari env, `withCredentials: true`.
- Upload: MIME allowlist di `src/lib/upload.ts` (selaras backend). File disimpan di MinIO lewat API, bukan di folder frontend.

Jika login berhasil di Swagger (`/docs`) tetapi gagal di UI, periksa `VITE_API_BASE_URL`, `CORS_ORIGIN`, dan bahwa kedua proses memakai HTTP (bukan campuran localhost vs 127.0.0.1 yang memecah cookie).
