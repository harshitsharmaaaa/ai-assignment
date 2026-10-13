import { Router } from "express";

export const leadsRouter = Router();

// Stub — lead CRUD lands here later.
leadsRouter.get("/", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Leads listing not implemented yet" } });
});
