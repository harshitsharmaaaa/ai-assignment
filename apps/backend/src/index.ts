import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Root .env is source of truth; backend runs from apps/backend.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`LeadFlow backend listening on :${env.PORT}`);
});
