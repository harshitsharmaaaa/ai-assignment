import { z } from "zod";
import { leadStatusSchema } from "./constants.js";

/** ISO 8601 datetime string (UTC `Z` or numeric offset), e.g. from `Date.toISOString()`. */
export const isoDatetimeSchema = z.string().datetime({ offset: true });

const emptyToUndefined = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const emptyToNull = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? null : v;

/** Loose phone check: digits plus `+ - ( ) . space`, 5 to 30 chars. Do not over-validate. */
const phoneInner = z
  .string()
  .trim()
  .min(5, "Phone number looks too short")
  .max(30, "Phone number must be at most 30 characters")
  .regex(/^[0-9+().\-\s]+$/, "Phone number contains invalid characters");

const nameField = z.string().trim().min(1, "Name is required").max(120, "Name is too long");
const companyField = z.string().trim().max(120, "Company is too long");

export const createLeadSchema = z.object({
  name: nameField,
  company: z.preprocess(emptyToUndefined, companyField.optional()),
  phone: z.preprocess(emptyToUndefined, phoneInner.optional()),
});

export const updateLeadSchema = z
  .object({
    status: leadStatusSchema.optional(),
    name: nameField.optional(),
    company: z.preprocess(emptyToNull, companyField.nullable().optional()),
    phone: z.preprocess(emptyToNull, phoneInner.nullable().optional()),
    nextFollowUpAt: z.preprocess(emptyToNull, isoDatetimeSchema.nullable().optional()),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const createDiscussionSchema = z.object({
  note: z.string().trim().min(1, "Note is required").max(2000, "Note is too long"),
  followUpAt: isoDatetimeSchema.optional(),
});

export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100, "Search is too long").optional(),
  ),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
