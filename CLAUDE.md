# Klyro: guide for AI assistants

Klyro ("Where ideas come together") is a community blogging platform: an npm-workspaces monorepo with a TypeScript Express API (`server/`) and a React app (`client/`). Read `docs/PROGRESS.md` first for current status, decisions and next steps, and update it at the end of a work session.

## Rules for this repo

- **Git identity:** commit only as `Aakif9866 <aakif9866@gmail.com>` (already set in local repo config). Never use the machine's global identity.
- **Branches:** work on `v2`. Pushing to `main` deploys the live site on Render. Never push or merge to `main` without explicit approval.
- **Ask before** committing, pushing, re-seeding (`--force` wipes the local database) or touching production data.
- **Secrets:** never read, print or commit `mern-blog-final.env` (real production secrets) or `.env`.
- **Demo content:** personas must be fictional. Real public figures may be discussed as subjects (their public work), never impersonated.

## Commands (run from the repo root)

```bash
REDIS_PORT=6380 docker compose up -d mongo redis mailpit   # local services (6379 is taken on this machine)
npm run dev                  # API :3000 + web :5173 (Vite proxies /api, /uploads, /socket.io)
npm run lint && npm run typecheck && npm test               # what CI runs, plus the builds below
npm run build -w client && npm run build -w server
npm run seed [-- --force]    # demo community; --force wipes the DB first
npm run migrate:v1 [-- --apply]
```

## Architecture in brief

- **Server:** `routes/index.ts` declares every endpoint through `documentedRouter` (`docs/registry.ts`) with an access level (`public`, `user`, `writer`, `member`, `moderator`, `admin`) and Zod schemas from `validators/`. The same table generates the OpenAPI spec. Controllers are thin; logic lives in `services/`; models in `models/`.
- **Access levels:** `writer` = signed in, active, verified (guests allowed). `member` = writer but not a guest (publish, comment, report, uploads, AI).
- **Optional infrastructure:** Redis powers cache, rate limits and BullMQ; without it, jobs run in-process (`lib/queue.ts`). AI (`lib/ai/`) falls back to local heuristics without keys.
- **Client:** TanStack Query for server state (`api/hooks.ts`, `api/keys.ts`); Redux only for auth and UI (`store/`). Auth lives in httpOnly cookies; `lib/api.ts` sends `X-Requested-With: klyro` and silently refreshes on 401.
- **Styling:** Tailwind 4 tokens in `client/src/index.css` (`brand-50`…`brand-950`, `page`, `surface`, `muted`, `line`, `ink`, `ink-soft`). Any new color shade must be defined there, or Tailwind silently drops the class.

## Gotchas learned the hard way

- Jest needs `runtimeAdapters: { os }` in `tests/setup.ts`; the MongoDB driver's dynamic import fails in Jest's sandbox.
- Jest must transform the ESM-only `htmlparser2` family (see `jest.config.js`).
- Chrome's `scrollTo()` returns a Promise, so never write `useEffect(() => window.scrollTo(...))` without braces.
- One-time tokens (email verification) must be sent from a query, not an effect: StrictMode runs effects twice.
- Dropping the database while the server runs removes indexes; the server ensures indexes at startup, and the seed re-syncs them.
- Keep UI checks honest: test layouts at 320-1920 px and measure text contrast (WCAG AA 4.5:1).
