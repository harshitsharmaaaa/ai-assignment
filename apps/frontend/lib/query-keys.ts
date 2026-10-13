import type { LeadStatus } from "@leadflow/shared";

export type LeadFilters = {
  status: LeadStatus | "ALL";
  search: string;
};

export const DEFAULT_FILTERS: LeadFilters = { status: "ALL", search: "" };

export const leadsKeys = {
  all: ["leads"] as const,
  list: (filters: LeadFilters) => ["leads", filters] as const,
};

export const discussionsKey = (leadId: string) => ["discussions", leadId] as const;
