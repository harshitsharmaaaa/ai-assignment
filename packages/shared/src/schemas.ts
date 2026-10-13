import { z } from "zod";
import { leadStatusSchema } from "./constants.js";

export const leadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: leadStatusSchema.default("NEW"),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createLeadSchema = z.object({
  name: z.string().min(1, "name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  status: leadStatusSchema.default("NEW").optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const discussionSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  note: z.string().min(1, "note is required"),
  createdAt: z.coerce.date(),
});

export const createDiscussionSchema = z.object({
  note: z.string().min(1, "note is required"),
});

export const leadIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const leadListQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  search: z.string().optional(),
});

export type Lead = z.infer<typeof leadSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type Discussion = z.infer<typeof discussionSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
