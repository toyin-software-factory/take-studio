# Take Studio

Upload a raw green screen take, get back a YouTube ready cut. Look and behaviour: `DESIGN.md` (Edit Bay). Plan: `docs/scope/scope.md`.

## Stack

- **Language / Runtime**: TypeScript (strict) everywhere, Node 22
- **Framework**: Next.js 15 App Router with React 19 (`apps/web`), Node worker with ffmpeg 7 in Docker (`apps/worker`)
- **Key dependencies**: Drizzle ORM on Postgres, pg-boss (queue on the same Postgres), Cloudflare R2 via presigned URLs (MinIO locally), Deepgram, Auth.js with Resend, Tailwind CSS 4 and Radix
- **Package manager**: pnpm 10 workspace (`apps/*`, `packages/*`), no task runner
- **Hosting**: Railway (`web`, `worker`, Postgres), `dev` environment fed by `main`. Source: `docs/specs/0001-stack-architecture.md`

## Build approach

Tracer Bullet (each slice works end to end, from storage and the worker through to the workspace, before the next one starts).

## Commands

```bash
pnpm install                    # install
docker compose up -d --wait     # local Postgres :5432 and MinIO :9000
cp .env.example .env           # then fill in local values (DATABASE_URL at least, see README "Run locally")
set -a; . ./.env; set +a        # apps read env from the shell
pnpm db:migrate                 # apply Drizzle migrations
pnpm dev                        # web on :3000 plus worker
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # what CI runs
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Functional style: pure functions by default, side effects (DB, R2, ffmpeg, Deepgram, network) pushed to the edges and kept explicit. Plain functions over classes. Module level values are constants only (the cached pool and queue in `apps/web/src/lib/server.ts` are the deliberate exception).
- Never mutate inputs; prefer `readonly` types and `const`. Media maths (cuts, timings, SRT) lives in `packages/media` as pure functions.
- Types are strict: `strict` plus `noUncheckedIndexedAccess`, no `any`, no non null `!` to silence the compiler. Model states as discriminated unions and switch on them exhaustively.
- Expected failures (upload rejected, step failed, invite missing) are returned as typed results; throw only for bugs and missing config.
- Edits are never destructive: cuts and word fixes are rows; only export applies them. Every query is scoped to the owner.
- Env vars: names in `.env.example` (never values). Check a required var where it is first read and fail fast with its name. Never log or commit secrets.
- Named exports only, except where a framework requires a default (Next.js `page` and `layout`, ESLint config files).
- Folder by feature inside each app; code shared by web and worker goes in a `packages/*` workspace.
- UI meets WCAG AA and follows `DESIGN.md` exactly (dark only, no spinners, real percentages).
- Tests only where they earn their keep: Vitest for media and data logic, a Playwright smoke for the review flow. No tests for markup, styling or trivial code.

## Tooling

- Lint: ESLint 9 flat config in every workspace (`next/core-web-vitals` in web, `typescript-eslint` recommended elsewhere). Format: Prettier at the root, checked in CI.
- Before commit: lint and format on staged files. Typecheck runs in CI.
- CI: GitHub Actions on every PR (lint, typecheck, test, build) plus Lighthouse (3 runs; performance warns, accessibility, best practices and SEO fail).
- Installing what is missing (Prettier, the pre commit hook, lint in `packages/media`) is scope feature 2, `/develop tooling`.

## Git

- integration: on
- branch: one per issue, named with the issue key (for example `sof-33-audit-agents-md`)
- commit: per-milestone, subject starts with the issue key (`[SOF-33] ...`)
- PRs: title starts with the issue key, squash merged after CodeRabbit and CI pass; nobody merges their own PR

## Context files

- [apps/web/AGENTS.md](apps/web/AGENTS.md) (Next.js workspace UI and API routes)
- [apps/worker/AGENTS.md](apps/worker/AGENTS.md) (pg-boss worker that runs ffmpeg and Deepgram steps)
- [packages/db/AGENTS.md](packages/db/AGENTS.md) (Drizzle schema, migrations, progress notify)
- [packages/media/AGENTS.md](packages/media/AGENTS.md) (pure media maths shared by web and worker)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
