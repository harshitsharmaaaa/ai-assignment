import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single root .env is source of truth. When Prisma CLI runs from packages/db
// (via turbo --filter), CWD is packages/db, so load ../../.env explicitly.
// Falls back to default dotenv behavior if already loaded via process env / turbo globalEnv.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Dummy fallback lets `prisma generate` (incl. postinstall on a clean clone
// with no .env yet) succeed offline. Migrate/seed/studio still need a real
// DATABASE_URL and will fail to connect without one — which is intended.
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://leadflow:leadflow_dev_pw@localhost:5432/leadflow";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
