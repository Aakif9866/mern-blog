# Klyro progress log

Where the project stands, what was decided, and what comes next. Update this file at the end of each work session.

_Last updated: 27 Sep 2026_

## Branches

| Branch | What it is | Deployed? |
|---|---|---|
| `main` | v1 (the original 2024 MERN blog) + `complete_readme.md` | **Yes.** Render auto-deploys every push to `main` → https://mern-blog-final.onrender.com |
| `v1` | Frozen backup copy of `main` | No |
| `v2` | Klyro, the full rebuild. All new work happens here. | No, not yet |

Pushing to `main` redeploys the live site. Don't merge `v2` into `main` until the launch checklist below is done.

## Done in v2

- **Backend** (`server/`, TypeScript, Express 5, Mongoose 9): routes → controllers → services → models, Zod validation, central errors, Pino logs, cursor pagination, indexes, Redis cache, BullMQ jobs, OpenAPI docs generated from the route table.
- **Auth and security**: access + rotating refresh tokens in httpOnly cookies with reuse detection, sign out everywhere, email verification, password reset, server-verified Google sign-in, rate limits, CSRF header, Helmet and CORS, `/auth/session` probe.
- **Blogging**: Tiptap editor (Markdown shortcuts and paste, code highlighting, images), drafts with autosave, scheduling, tags, series, edit history, soft delete, views, sanitized HTML.
- **Social**: follows (people and tags), Like/Helpful, bookmarks and collections, nested comments with @mentions, notifications (Socket.io, email, weekly digest), share menu, server-side SEO tags.
- **Discovery**: Following/Latest/Trending feeds, search (text + prefix, or Atlas Search), tag pages, related posts via embeddings, trending tags, onboarding.
- **Moderation**: reports queue, suspend/ban, role hierarchy, analytics dashboard (admin/moderator: avatar menu → Moderation → Analytics).
- **Guest mode**: "Continue as guest" creates a 24-hour account that can follow, react, bookmark and draft, but not publish, comment, report, upload or use AI. Guests can upgrade in place and keep everything. Expired guests are removed hourly.
- **AI** (optional): Claude TL;DRs and tag suggestions; Voyage or local embeddings.
- **Frontend** (`client/`, React 19, TypeScript, Tailwind 4, TanStack Query, Redux for auth/UI only): Klyro branding, responsive from 320 px, dark mode, skeletons, infinite scroll, optimistic updates.
- **Demo community** for local use: `npm run seed` (30 fictional members, 48 posts, threads, reactions, follows). Data lives in `server/src/scripts/seed-community.ts`.
- **Ops**: Dockerfile, docker-compose (MongoDB, Redis, Mailpit), GitHub Actions CI, `.env.example`, v1 → v2 migration script (tested on a v1-shaped local copy).
- **Contact**: klyroapp2026@gmail.com in the footer and README.
- **Verification**: lint, typecheck, 47 API tests and 16 UI tests pass. 20 end-to-end browser flows and a responsive audit (320-1920 px) pass on the production Docker build.

## Decisions (and why)

- **Commit identity**: all commits as `Aakif9866 <aakif9866@gmail.com>`, set in this repo's local git config. The global git identity on this machine is a work account and must never be used here.
- **No new content types** (Q&A, communities, polls, quick posts): the owner chose to keep posts as they are.
- **Demo personas are fictional.** Real celebrities appear only as the subject of fan and critic talk about their public work, never as accounts or first-person posts.
- **Demo data is local only**, never on the live site.
- **Redis and AI keys are optional**, so the app works with just MongoDB.
- **Google sign-in was rebuilt** to verify ID tokens on the server; v1 trusted the email sent by the browser.
- **Default AI model** is `claude-opus-5`, configurable with `AI_MODEL`.

## Launch checklist (v2 → live)

- [ ] Back up the production Atlas database (`mongodump`).
- [ ] Run `npm run migrate:v1` (dry run), then `npm run migrate:v1 -- --apply` against production.
- [ ] Set Render env vars: `NODE_ENV=production`, `APP_URL`, `JWT_ACCESS_SECRET` (the existing `MONGO` and `JWT_SECRET` also work), plus optional `REDIS_URL`, SMTP, `GOOGLE_CLIENT_ID`, `ANTHROPIC_API_KEY`.
- [ ] Handle uploads: Render's disk is wiped on deploy. Add a persistent disk or switch `saveImage()` to S3 or Cloudinary.
- [ ] Merge `v2` into `main` (this deploys), then smoke-test sign-in, posting and old `/post/<slug>` links.

## Waiting on the owner

- Anthropic API key (AI TL;DRs and tag suggestions)
- Google OAuth client ID ("Continue with Google")
- Email sending for klyroapp2026@gmail.com (Gmail app password, or a service like Resend or Brevo)
- Go-ahead and Atlas backup for the launch checklist

## Local environment notes

- Services: `REDIS_PORT=6380 docker compose up -d mongo redis mailpit` (host port 6379 is used by another project on this machine).
- The local `.env` (git-ignored) points Redis at `redis://127.0.0.1:6380` and SMTP at Mailpit.
- `mern-blog-final.env` in the repo root holds **real production secrets**. It's git-ignored; never commit, print or use it.
- `npm run seed -- --force` wipes the local database, including the owner's local account. Warn before running it.

## Ideas for later (out of scope for v2)

Next.js / server rendering, splitting into services, a CDN and object storage for media, Elasticsearch, and a metrics and tracing stack.
