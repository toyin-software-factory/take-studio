# apps/worker

## Overview

A long lived Node service that takes jobs from pg-boss and runs the pipeline steps (trim, key, place, transcribe) and exports with ffmpeg and Deepgram. It processes one job at a time and reports each step's progress to Postgres with `NOTIFY`.

## Stack

Node 22, ESM, run with `tsx` (no compile step at runtime). pg-boss imported directly; `@take-studio/db` for the pool, schema and progress helpers. ffmpeg and ffprobe 7 from the pinned static build in the Docker image. ESLint with `typescript-eslint`, Vitest.

## Key files

| File           | Owns                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `src/index.ts` | Startup, queue registration, graceful shutdown on SIGTERM and SIGINT |
| `Dockerfile`   | Production image with ffmpeg 7 (build from the repo root)            |

## Commands

```bash
pnpm --filter @take-studio/worker dev     # tsx watch
pnpm --filter @take-studio/worker lint
pnpm --filter @take-studio/worker typecheck
pnpm --filter @take-studio/worker test
docker build -f apps/worker/Dockerfile .  # from the repo root
```

## Conventions

- Keep one job at a time (`batchSize: 1`); a second take waits in the queue.
- A step handler is a thin shell: read inputs, call pure functions from `@take-studio/media`, run ffmpeg, write results and progress. Parsing and maths do not live here.
- Progress comes from real work (ffmpeg `-progress` time over take length, finished transcription chunks), never a timer.
- Root `## Rules` apply.

## Gotchas

- Debian bookworm ships ffmpeg 5; the Dockerfile pins a 7.x static build by SHA256. Bump version and hash together.
- The Dockerfile copies each workspace manifest by hand; a new workspace the worker depends on must be added there.
- Shutdown is graceful with a 30 second timeout; long steps must be safe to retry after a restart.

## Related specs

- `docs/specs/0001-stack-architecture.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
