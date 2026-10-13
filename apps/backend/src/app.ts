import cors from "cors";
import express from "express";
import type { Env } from "./config/env.js";
import "./lib/db.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { apiRouter } from "./routes/index.js";

export function createApp(env: Env) {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
