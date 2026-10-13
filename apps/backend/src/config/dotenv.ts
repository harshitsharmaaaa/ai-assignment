import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load the single root `.env` as early as possible.
 *
 * IMPORTANT: this module must be the FIRST import in `src/index.ts` (and in
 * test setup). ESM imports are hoisted, so `dotenv.config()` calls placed as
 * bare statements in `index.ts` would run AFTER `@leadflow/db` creates its
 * Prisma client (via the app -> db import chain), leaving `DATABASE_URL`
 * undefined at adapter construction time.
 *
 * `dist/` mirrors `src/`, so `../../../.env` resolves to the repo root both
 * when running via tsx (`src/config`) and node (`dist/config`).
 */
const here = path.dirname(fileURLToPath(import.meta.url));
for (const p of [
  path.resolve(here, "../../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
]) {
  dotenv.config({ path: p });
}
