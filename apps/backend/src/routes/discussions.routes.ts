import { Router } from "express";

export const discussionsRouter = Router();

// Stub — discussion endpoints land here later.
discussionsRouter.get("/", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Discussions not implemented yet" } });
});
