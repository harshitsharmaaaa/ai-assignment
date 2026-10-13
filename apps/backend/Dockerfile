# ---- LeadFlow backend: install workspaces, build, run migrations, start ----
FROM oven/bun:1.3 AS app
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bun run build --filter=@leadflow/backend

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["sh", "apps/backend/entrypoint.sh"]
