import { z } from "zod";

/** Canonical lead statuses — mirrors Prisma enum LeadStatus. */
export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadStatusSchema = z.enum(LEAD_STATUSES);
