# 0001 Stack and architecture

**Status**: Proposed
**Date**: 2026-11-09
**Scope feature**: 1. Stack & architecture (`docs/scope/scope.md`)

## Summary

Take Studio is one TypeScript monorepo with two deployable services: a Next.js web app (the workspace and its API) and a Node worker that runs ffmpeg. They share one Postgres database, which also serves as the job queue. Raw takes, backgrounds, previews and exports live in Cloudflare R2 object storage and go straight between the browser and R2, so the web app never handles video bytes. Deepgram does the transcription. Railway hosts the web app, the worker and Postgres.

## Requirements

- R1. Upload takes of up to 30 minutes (several GB) that resume after a dropped connection.
- R2. Run trim, key, place, transcribe in that fixed order, with a real percentage for every step and no spinners.
- R3. Long jobs: one 30 minute take can take many minutes per step, so the worker must not be a short lived serverless function.
- R4. Edits are never destructive: cuts and word fixes are data, and only export applies them.
- R5. Export at 1080p as an MP4 download, plus an SRT caption file timed to the final cut.
- R6. Invite only sign in, each person sees only their own takes, backgrounds and settings.
- R7. Merges deploy to a dev environment only; Toyin promotes to production.
- R8. Secrets come from environment variables and are never committed or logged.

## Decision

| Concern | Pick | Runner up |
|---|---|---|
| Language | TypeScript (strict) everywhere | |
| Repo layout | pnpm workspace: `apps/web`, `apps/worker`, `packages/db`, `packages/media` | |
| Web app | Next.js (App Router) with React, server routes for the API | Remix |
| Styling | Tailwind CSS with the `DESIGN.md` tokens as CSS variables; Radix primitives for dialog, tooltip and menus; Archivo and JetBrains Mono through `next/font` | CSS Modules |
| Database | Postgres, accessed with Drizzle ORM and its migrations | Prisma |
| Job queue | pg-boss on the same Postgres (no Redis to run) | BullMQ with Redis |
| Worker | Node service in a Docker image with ffmpeg 7, one job at a time | |
| Object storage | Cloudflare R2 (S3 compatible), private bucket, presigned URLs only | AWS S3 |
| Uploads | Browser direct to R2 with S3 multipart upload (64 MB parts); finished parts are remembered so an upload resumes where it stopped | tus server |
| Transcription | Deepgram (Nova model, prerecorded, word level timestamps) | AssemblyAI |
| Auth | Auth.js with email magic links sent through Resend; an invite list gates who may sign in | Clerk |
| Live progress | Worker writes step progress to Postgres and fires `NOTIFY`; the web app streams it to the browser over Server Sent Events | Polling every second |
| Hosting | Railway: `web`, `worker` and Postgres services, with a `dev` environment fed by `main` | Fly.io |
| CI | GitHub Actions: lint, typecheck, unit tests, build; Lighthouse CI per the factory defaults | |
| Tests | Vitest for media and data logic (cut maths, SRT timing, progress parsing); Playwright smoke for the main review flow | |

## How the pieces fit

**Upload.** The browser asks the web app to start an upload, gets presigned part URLs, sends parts straight to R2 and reports each finished part. After a dropped connection it asks which parts R2 already has and sends only the rest. The library row shows the real percentage of bytes sent.

**Pipeline.** Finishing an upload queues one pipeline run when the owner has a background set. Otherwise the take stays in the library as unprocessed, with the state "Needs background" and a link to settings; once a background is set, "Process take" on that take queues its run. The worker runs the four steps in order and writes each step's state, percentage and duration to Postgres. Progress for ffmpeg steps comes from ffmpeg's `-progress` output (time processed divided by take length). Transcription progress comes from splitting the audio into chunks of about two minutes and counting finished chunks.

1. **Trim.** ffmpeg `silencedetect` on the audio at the person's pause length (0.8 s by default) writes numbered cuts. Nothing is removed from the video. The worker also writes waveform peaks for the timeline and renders a 720p proxy of the raw take, so the preview works before key and place have run.
2. **Key.** ffmpeg `chromakey` plus despill on the full take. The threshold used is stored so the UI can show it as a number.
3. **Place.** Composites the keyed take over the person's background and renders a 720p preview MP4 of the full take that replaces the raw proxy (cuts are skipped during playback, not cut out). The web app checks for a background before queueing any run (automatic or from "Process take"), so place never starts without one. Changing the key threshold reruns key and place for that take only.
4. **Transcribe.** Extracts audio, sends the chunks to Deepgram in parallel, stitches the words back onto the full take timeline and stores each word with its start and end time.

**Review.** The workspace plays the preview and jumps over active cuts. Toggling a cut or fixing a word only updates rows in Postgres, so it is instant and undoable.

**Export.** Queues an export job: the worker renders 1080p H.264/AAC from the raw take with key, place and the active cuts applied in one ffmpeg pass, and builds the SRT from the words that survive the active cuts, shifted onto the trimmed timeline. A word is dropped when its midpoint falls inside an active cut; a kept word that overlaps a cut boundary is clamped to the kept side of that boundary before shifting. The same rule marks words as cut in the transcript, so the SRT always matches what the transcript shows. Both files go to R2 and download through presigned URLs.

## Build plan

1. Scaffold the pnpm workspace, `apps/web` (Next.js), `apps/worker` (Node + ffmpeg Dockerfile), `packages/db` (Drizzle, empty schema), `packages/media` (empty).
2. Local development: Docker Compose for Postgres and MinIO (stands in for R2), `.env.example` listing every variable without values.
3. Prove the wiring: the web app enqueues a no op job, the worker picks it up and reports 0 to 100 percent, and the browser sees it over SSE.
4. CI on GitHub Actions (lint, typecheck, test, build) and Railway config for `web` and `worker` in a `dev` environment.

## Environment variables (names only)

`DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `DEEPGRAM_API_KEY`, `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `APP_URL`.

## Consequences

- One database for data and queue keeps the moving parts small; if job volume ever outgrows it, pg-boss can be swapped for Redis without touching the steps.
- R2 has no egress fees, which matters because every preview and export is downloaded.
- Railway runs the worker as a long lived container, so a 30 minute take is not cut off by a function timeout. One worker processes one take at a time; a second take waits in the queue with its chips at 0 percent and pending.
- Deepgram is an external service: audio leaves our infrastructure for transcription.

## Setup only Toyin can do (asked for after the scaffold merges)

1. Railway: a project `take-studio` with a `dev` environment, and an invite for the factory GitHub app or a project token.
2. Cloudflare R2: a private bucket `take-studio-dev`, an API token scoped to it, and a bucket CORS policy that allows the dev app origin (`APP_URL`) with methods `PUT`, `GET` and `HEAD`, allowed header `Content-Type`, and exposed header `ETag` (multipart upload needs the ETag of each part). Without it, direct browser uploads fail even with valid presigned URLs.
3. Deepgram: an API key.
4. Resend: an API key and a verified sending domain (DNS records) for sign in emails.
5. GitHub repo settings: squash merge only, delete head branches. The repo is currently public; say if it should be private.

## Follow-up

- 0002 Data model (`/architect data model`).
- Specs for invite only sign in, upload, pipeline, trim, preview, key and place, transcript, export, as listed in the scope.

## Rationale

Considered: Vercel for the web app (rejected: serverless time limits suit the web app but not ffmpeg, and splitting hosting adds a second dashboard for little gain); Supabase for database, auth and storage in one (rejected: storage egress costs for video and less control over large multipart uploads); OpenAI Whisper API (rejected: 25 MB file limit forces chunking anyway and it returns no live progress, while Deepgram is fast, cheap per minute and gives word timings); Redis queue (rejected for now: one more service with nothing it does that pg-boss cannot at this volume).
