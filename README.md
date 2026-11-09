# Take Studio

Upload a raw green screen take and get back a YouTube ready cut. Stack and architecture: `docs/specs/0001-stack-architecture.md`. Look and behaviour: `DESIGN.md`.

## Run locally

Needs Node 22+, pnpm 10 and Docker.

```sh
pnpm install
docker compose up -d --wait   # Postgres on :5432, MinIO on :9000 (console :9001)
cp .env.example .env          # then fill in the values below
set -a; . ./.env; set +a      # the apps read variables from the shell
pnpm db:migrate
pnpm dev                      # web on http://localhost:3000, worker alongside
```

Local values for `.env`: `DATABASE_URL=postgres://takestudio:takestudio@localhost:5432/takestudio`, `APP_URL=http://localhost:3000`. For MinIO use `R2_ACCESS_KEY_ID=takestudio` and `R2_SECRET_ACCESS_KEY=takestudio-secret`. Deepgram, Auth.js and Resend values are not needed yet.

### Check the wiring

With web and worker running:

```sh
ID=$(curl -s -X POST localhost:3000/api/wiring/jobs | sed 's/.*"id":"\([^"]*\)".*/\1/')
curl -N localhost:3000/api/wiring/jobs/$ID/events   # streams percent 0 to 100
```

### Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. CI runs the same on every PR, plus Lighthouse.

### Worker image

`docker build -f apps/worker/Dockerfile .` (ffmpeg 7 included).

## Deploy

Railway project `take-studio`, environment `dev`, fed by `main`. Railway Config as Code is closed to new services (existing files stop being read on 2026-12-01), so the two services are set up in the dashboard. Both use the repo root as the root directory.

| Service | Builder | Build command | Start command | Healthcheck | Restart |
|---|---|---|---|---|---|
| `web` | Railpack | `pnpm --filter @take-studio/web build` | `pnpm --filter @take-studio/web start` | `/` | On failure |
| `worker` | Dockerfile at `apps/worker/Dockerfile` | (image build) | (image `CMD`) | none | Always |

Generate a public domain for `web` (Settings > Networking) and set `APP_URL` to it; `worker` gets none. Add a Postgres service and set `DATABASE_URL` (reference the Postgres variable) on both. Set the other variables from `.env.example` as each feature needs them. Moving this to Railway Infrastructure as Code (`.railway/railway.ts`) is a possible follow-up.
