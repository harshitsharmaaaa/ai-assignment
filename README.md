# LeadFlow

Single-screen lead management tool (lightweight CRM) for sales reps.

## Setup

**Prerequisites:** [Bun](https://bun.sh) (1.3.9), [Node.js](https://nodejs.org) 20+, [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run locally (recommended)

```bash
bun install
cp .env.example .env
bun run db:up
bun run db:migrate
bun run db:seed
bun run dev
```

Open http://localhost:3000 — API on http://localhost:4000.

### Run with Docker Compose

```bash
cp .env.example .env
SEED=true docker compose up --build
```

Open http://localhost:3000.

### Other commands

```bash
bun run build       # production build
bun run lint        # lint all packages
bun run typecheck   # typecheck all packages
bun run test        # all tests (needs DB up)
bun run db:down     # stop postgres container
```
