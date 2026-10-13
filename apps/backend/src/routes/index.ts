import { Router } from "express";
import { leadsRouter } from "./leads.routes.js";

export const apiRouter = Router();

apiRouter.use("/leads", leadsRouter);
