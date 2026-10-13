import "./config/dotenv.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`LeadFlow backend listening on :${env.PORT}`);
});
