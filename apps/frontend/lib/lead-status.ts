import type { LeadStatus } from "@leadflow/shared";
import { LEAD_STATUSES } from "@leadflow/shared";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost",
};

/** Badge color classes per status (spec 4.1). Static literals so Tailwind picks them up. */
export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  NEW: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONTACTED:
    "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  QUALIFIED:
    "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  PROPOSAL_SENT:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  WON: "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
  // Muted rose: recognizably red-ish but distinct from the overdue red.
  LOST: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = LEAD_STATUSES.map(
  (status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }),
);
