import type { Request, Response } from "express";
import type {
  CreateDiscussionInput,
  CreateLeadInput,
  IdParam,
  ListLeadsQuery,
  UpdateLeadInput,
} from "@leadflow/shared";
import * as leadsService from "../services/leads.service.js";

export async function getLeads(req: Request, res: Response): Promise<void> {
  const data = await leadsService.listLeads(req.query as ListLeadsQuery);
  res.status(200).json({ data });
}

export async function createLead(req: Request, res: Response): Promise<void> {
  const data = await leadsService.createLead(req.body as CreateLeadInput);
  res.status(201).json({ data });
}

export async function getLeadById(req: Request, res: Response): Promise<void> {
  const data = await leadsService.getLead((req.params as unknown as IdParam).id);
  res.status(200).json({ data });
}

export async function updateLeadById(req: Request, res: Response): Promise<void> {
  const data = await leadsService.updateLead(
    (req.params as unknown as IdParam).id,
    req.body as UpdateLeadInput,
  );
  res.status(200).json({ data });
}

export async function getDiscussions(req: Request, res: Response): Promise<void> {
  const data = await leadsService.listDiscussions((req.params as unknown as IdParam).id);
  res.status(200).json({ data });
}

export async function addDiscussion(req: Request, res: Response): Promise<void> {
  const data = await leadsService.addDiscussion(
    (req.params as unknown as IdParam).id,
    req.body as CreateDiscussionInput,
  );
  res.status(201).json({ data });
}
