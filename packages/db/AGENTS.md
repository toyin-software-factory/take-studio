# packages/db

## Overview

The shared data layer for web and worker: the Drizzle schema and migrations, the Postgres pool factory, and the progress write plus `NOTIFY` helpers. The same Postgres also hosts the pg-boss queue.

## Stack

Drizzle ORM 0.44 and drizzle-kit 0.31 on `pg`. Consumed as TypeScript source (`exports` points at `src/index.ts`), no build step.

## Key files

| File | Owns |
|---|---|
| `src/schema.ts` | Drizzle tables (empty until spec 0002 lands) |
| `src/index.ts` | `createPool`, `createDb`, schema and helper re exports |
| `src/progress.ts` | Wiring proof progress table, `NOTIFY` channel and queue name |
| `drizzle/` | Generated SQL migrations and journal |
| `drizzle.config.ts` | drizzle-kit config, reads `DATABASE_URL` |

## Commands

```bash
pnpm -w db:generate  # write a migration from schema.ts changes (works from any directory)
pnpm -w db:migrate   # apply migrations (needs DATABASE_URL in the shell)
pnpm --filter @take-studio/db lint
pnpm --filter @take-studio/db typecheck
```

## Conventions

- Change the schema in `src/schema.ts`, then run `pnpm -w db:generate` and commit everything it writes under `drizzle/` together: the SQL, `meta/_journal.json` and the `meta/*_snapshot.json` files (without the snapshots the next generate diffs against an empty schema). Never hand edit an applied migration.
- Every owned table carries the owner's id, and every query filters by it.
- Root `## Rules` apply.

## Gotchas

- `src/progress.ts` creates its table at runtime as a wiring proof; real pipeline progress tables replace it with the data model.

## Related specs

- `docs/specs/0001-stack-architecture.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
