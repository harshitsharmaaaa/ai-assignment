import { Router } from "express";
import { discussionsRouter } from "./discussions.routes.js";
import { leadsRouter } from "./leads.routes.js";

export const apiRouter = Router();

apiRouter.use("/leads", leadsRouter);
apiRouter.use("/discussions", discussionsRouter);
