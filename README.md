# Take Studio

Upload a raw green screen take and get back a YouTube ready cut. Stack and architecture: `docs/specs/0001-stack-architecture.md`. Look and behaviour: `DESIGN.md`.

## Run locally

Needs Node 22+, pnpm 10 and Docker.

```sh
pnpm install
docker compose up -d          # Postgres on :5432, MinIO on :9000 (console :9001)
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

`apps/web/railway.json` and `apps/worker/railway.json` configure the Railway `web` and `worker` services in the `dev` environment. Set `DATABASE_URL` and the other variables from `.env.example` in Railway.
