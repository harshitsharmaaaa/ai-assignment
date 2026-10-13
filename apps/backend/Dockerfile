# ---- LeadFlow backend: install workspaces, build, run migrations, start ----
FROM oven/bun:1.3 AS app
WORKDIR /app

COPY . .

# Retry installs: big-tarball downloads occasionally fail integrity checks on
# flaky networks. The cache mount keeps already-fetched packages across
# attempts so retries converge instead of starting over.
ENV BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache
RUN --mount=type=cache,target=/root/.bun/install/cache \
  sh -c 'for i in 1 2 3 4 5; do bun install --frozen-lockfile && break || { echo "install attempt $i failed, retrying..."; sleep 10; }; done'
RUN bun run build --filter=@leadflow/backend

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["sh", "apps/backend/entrypoint.sh"]
