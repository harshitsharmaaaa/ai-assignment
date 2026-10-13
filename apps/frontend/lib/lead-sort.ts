import type { LeadListItem } from "@leadflow/shared";

export type LeadSortKey = "activity" | "name" | "followup";

export const LEAD_SORT_OPTIONS: { value: LeadSortKey; label: string }[] = [
  { value: "activity", label: "Recent activity" },
  { value: "name", label: "Name" },
  { value: "followup", label: "Next follow-up" },
];

function activityTime(lead: LeadListItem): number {
  const at = lead.lastDiscussion?.createdAt ?? lead.createdAt;
  return new Date(at).getTime();
}

function followUpTime(lead: LeadListItem): number {
  // Leads without a follow-up sort last for the "followup" key.
  if (!lead.nextFollowUpAt) return Number.POSITIVE_INFINITY;
  return new Date(lead.nextFollowUpAt).getTime();
}

/**
 * Sort the non-pinned section only. Pinned ordering (follow-up ascending per
 * §4.4) is owned by `partitionLeads` and is never changed here.
 */
export function sortOthers(leads: LeadListItem[], sort: LeadSortKey): LeadListItem[] {
  const copy = [...leads];
  switch (sort) {
    case "name":
      copy.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
      break;
    case "followup":
      copy.sort((a, b) => {
        const diff = followUpTime(a) - followUpTime(b);
        if (diff !== 0) return diff;
        return activityTime(b) - activityTime(a);
      });
      break;
    case "activity":
    default:
      copy.sort((a, b) => activityTime(b) - activityTime(a));
      break;
  }
  return copy;
}
