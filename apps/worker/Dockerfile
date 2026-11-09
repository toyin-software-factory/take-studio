# Build from the repo root: docker build -f apps/worker/Dockerfile .
FROM node:22-bookworm-slim
# ffmpeg 7 comes from the pinned static build; Debian bookworm only ships 5.x.
ARG FFMPEG_VERSION=7.0.2
ARG FFMPEG_SHA256=abda8d77ce8309141f83ab8edf0596834087c52467f6badf376a6a2a4c87cf67
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
 && curl -fsSL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-${FFMPEG_VERSION}-amd64-static.tar.xz" -o /tmp/ffmpeg.tar.xz \
 && echo "${FFMPEG_SHA256}  /tmp/ffmpeg.tar.xz" | sha256sum -c - \
 && tar -xJf /tmp/ffmpeg.tar.xz -C /tmp \
 && mv /tmp/ffmpeg-${FFMPEG_VERSION}-amd64-static/ffmpeg /tmp/ffmpeg-${FFMPEG_VERSION}-amd64-static/ffprobe /usr/local/bin/ \
 && rm -rf /tmp/ffmpeg* /var/lib/apt/lists/* \
 && ffmpeg -version | head -1
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/media/package.json packages/media/
RUN pnpm install --frozen-lockfile --filter @take-studio/worker...
COPY tsconfig.base.json ./
COPY apps/worker apps/worker
COPY packages packages
CMD ["pnpm", "--filter", "@take-studio/worker", "start"]
