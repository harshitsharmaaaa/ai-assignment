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

/**
 * Linear-style badges (spec 4.1 hues): translucent tint + dot, no saturated
 * fills, so follow-up state (amber/red) always wins. Static literals so
 * Tailwind picks them up. Text tones target WCAG AA on both themes.
 */
export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  NEW: "border-transparent bg-slate-500/10 text-slate-600 dark:text-slate-300",
  CONTACTED:
    "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-300",
  QUALIFIED:
    "border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300",
  PROPOSAL_SENT:
    "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300",
  WON: "border-transparent bg-green-500/10 text-green-700 dark:text-green-300",
  // Muted rose: recognizably red-ish but distinct from the overdue red.
  LOST: "border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** 6px status dot shown inside the badge (same hue family). */
export const LEAD_STATUS_DOT_CLASSES: Record<LeadStatus, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-blue-500",
  QUALIFIED: "bg-violet-500",
  PROPOSAL_SENT: "bg-amber-500",
  WON: "bg-green-500",
  LOST: "bg-rose-400",
};

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = LEAD_STATUSES.map(
  (status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }),
);
