# ---- LeadFlow frontend: install workspaces, build, serve ----
FROM oven/bun:1.3 AS app
WORKDIR /app

COPY . .

# Same retry logic as apps/backend/Dockerfile (flaky big-tarball downloads).
ENV BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache
RUN --mount=type=cache,target=/root/.bun/install/cache \
  sh -c 'for i in 1 2 3 4 5; do bun install --frozen-lockfile && break || { echo "install attempt $i failed, retrying..."; sleep 10; }; done'

# NEXT_PUBLIC_* values are inlined at build time (this is the URL the BROWSER uses).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build --filter=@leadflow/frontend

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "--filter", "@leadflow/frontend", "start"]
