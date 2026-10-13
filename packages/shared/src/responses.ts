import { z } from "zod";
import { leadStatusSchema } from "./constants.js";

/** API response shapes. All timestamps are ISO 8601 strings (UTC). */

const isoString = z.string().datetime({ offset: true });

export const leadResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  status: leadStatusSchema,
  nextFollowUpAt: isoString.nullable(),
  createdAt: isoString,
  updatedAt: isoString,
});

export const lastDiscussionSchema = z.object({
  note: z.string(),
  createdAt: isoString,
});

export const leadListItemSchema = leadResponseSchema.extend({
  lastDiscussion: lastDiscussionSchema.nullable(),
});

export const discussionItemSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  note: z.string(),
  createdAt: isoString,
});

export const addDiscussionResponseSchema = z.object({
  discussion: discussionItemSchema,
  lead: leadListItemSchema,
});

export type LeadResponse = z.infer<typeof leadResponseSchema>;
export type LeadListItem = z.infer<typeof leadListItemSchema>;
export type DiscussionItem = z.infer<typeof discussionItemSchema>;
