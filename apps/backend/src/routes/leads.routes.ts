import { Router } from "express";
import {
  createDiscussionSchema,
  createLeadSchema,
  idParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "@leadflow/shared";
import {
  addDiscussion,
  createLead,
  getDiscussions,
  getLeadById,
  getLeads,
  updateLeadById,
} from "../controllers/leads.controller.js";
import { validate } from "../middleware/validate.js";

export const leadsRouter = Router();

leadsRouter.get("/", validate({ query: listLeadsQuerySchema }), getLeads);
leadsRouter.post("/", validate({ body: createLeadSchema }), createLead);
leadsRouter.get("/:id", validate({ params: idParamSchema }), getLeadById);
leadsRouter.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateLeadSchema }),
  updateLeadById,
);
leadsRouter.get("/:id/discussions", validate({ params: idParamSchema }), getDiscussions);
leadsRouter.post(
  "/:id/discussions",
  validate({ params: idParamSchema, body: createDiscussionSchema }),
  addDiscussion,
);
