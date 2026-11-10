# apps/web

## Overview

The Next.js app: the three panel workspace (library, stage, inspector) and the API as App Router route handlers. It never touches video bytes; the browser talks to R2 through presigned URLs, and live progress reaches the browser over Server Sent Events fed by Postgres `NOTIFY`.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS 4 (`@tailwindcss/postcss`), pg-boss and `pg` for enqueueing and listening, Vitest. Radix primitives (dialog, tooltip, toast) and `next/font` (Archivo, JetBrains Mono) are in; Auth.js arrives with its feature (spec 0001).

## Key files

| File                                              | Owns                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`, `src/app/page.tsx`          | Root layout and the workspace page                                                                       |
| `src/app/globals.css`                             | Tailwind entry; `DESIGN.md` tokens become CSS variables here                                             |
| `src/components/ui/`, `src/components/workspace/` | Base components (button, input, kbd, step chip, dialog, toast, tooltip) and the static three panel shell |
| `src/app/design/`                                 | Unlinked gallery of the base components                                                                  |
| `src/lib/server.ts`                               | Process wide Postgres pool and pg-boss instance, cached on `globalThis`                                  |
| `src/app/api/wiring/jobs/`                        | Wiring proof: enqueue a no op job and stream its progress (SSE)                                          |

## Commands

```bash
pnpm --filter @take-studio/web dev        # http://localhost:3000
pnpm --filter @take-studio/web lint
pnpm --filter @take-studio/web typecheck
pnpm --filter @take-studio/web test       # Vitest, src/**/*.test.ts
pnpm --filter @take-studio/web build
```

## Conventions

- Import from `src` with the `@/` alias. Shared logic comes from `@take-studio/db` and `@take-studio/media`, never copied.
- Route handlers that read the database or stream set `export const dynamic = "force-dynamic"`.
- Get the pool and queue through `getPool()` and `getBoss()`; never create a new pool per request (the SSE listener is the one deliberate dedicated client).
- Root `## Rules` apply. Look, layout and behaviour come from `DESIGN.md`; page and component PRs list their Mobbin references.

## Gotchas

- `pnpm build` runs without a database in CI (`DATABASE_URL` is a dummy), so nothing may connect at import or build time.
- SSE streams must send a keep alive comment and close their `pg` listener when the request aborts, or connections leak.

## Related specs

- `docs/specs/0001-stack-architecture.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
