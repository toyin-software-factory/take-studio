# packages/media

## Overview

Pure media logic shared by web and worker: cut maths, timeline shifting, SRT timing, and parsing of ffmpeg output. Empty in the scaffold; it fills as the pipeline, trim, transcript and export slices land.

## Stack

TypeScript only, no runtime dependencies. Consumed as source (`exports` points at `src/index.ts`).

## Commands

```bash
pnpm --filter @take-studio/media typecheck
```

`lint` and `test` scripts are added by `/develop tooling` and the first feature that puts logic here.

## Conventions

- Pure functions only: no file system, network, database, process spawning or env reads. The worker and web app do the IO and pass plain data in.
- This is the place for unit tests (Vitest, input and output assertions, no mocks).
- Positions on the take timeline are integer milliseconds from the start of the raw take (`startMs`, `endMs`), matching the data model. Convert to seconds only at the edge (ffmpeg arguments, SRT text, display).
- Root `## Rules` apply.

## Related specs

- `docs/specs/0001-stack-architecture.md`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
