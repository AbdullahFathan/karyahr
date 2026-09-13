# KaryaHR frontend

React + Vite + TypeScript app for KaryaHR. Runtime: **Bun**.

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` if you need to override the API origin:

```
VITE_API_BASE_URL=http://localhost:3000
```

The Vite dev server uses port **5173**. The backend must allow that origin with credentials:

```
CORS_ORIGIN=http://localhost:5173
```

There is no Vite proxy. The Axios client sends cookies with `withCredentials: true`.

## Scripts

```bash
bun run dev      # http://localhost:5173
bun run build    # tsc -b && vite build
bun run preview
bun run lint
```

## Auth (Phase 0)

Login is `/login` (email + password). Session cookies come from `POST /auth/login`. Route guards and `/auth/me` bootstrap land in Phase 1.

Seed accounts live in the backend seed. Confirm CORS with `GET /health` or by submitting the login form against a running `karyahr-be`.
