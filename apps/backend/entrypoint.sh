#!/bin/sh
# Container entrypoint: apply pending migrations, optionally seed, then start.
set -e

echo "Applying database migrations..."
bunx turbo run --filter=@leadflow/db db:deploy

if [ "$SEED" = "true" ]; then
  echo "SEED=true: seeding demo data..."
  bunx turbo run --filter=@leadflow/db db:seed
fi

echo "Starting LeadFlow backend..."
exec node apps/backend/dist/index.js
