import { isSameDay } from "date-fns";
import type { LeadListItem } from "@leadflow/shared";

const CLOSED = new Set(["WON", "LOST"]);

export function isClosed(lead: Pick<LeadListItem, "status">): boolean {
  return CLOSED.has(lead.status);
}

/**
 * Pure calendar-day check in the user's local timezone (no status logic).
 * Uses date-fns `isSameDay(date, now)` instead of `isToday(date)` so tests can
 * inject a fixed `now`; in production (`now = new Date()`) they are identical.
 */
export function isDueToday(
  lead: Pick<LeadListItem, "nextFollowUpAt">,
  now: Date = new Date(),
): boolean {
  if (!lead.nextFollowUpAt) return false;
  return isSameDay(new Date(lead.nextFollowUpAt), now);
}

/** Overdue = follow-up in the past and the lead is still open. */
export function isOverdue(lead: LeadListItem, now: Date = new Date()): boolean {
  if (!lead.nextFollowUpAt || isClosed(lead)) return false;
  return new Date(lead.nextFollowUpAt).getTime() < now.getTime();
}

/** Pinned = due today and still open (includes earlier-today items already past). */
export function isPinned(lead: LeadListItem, now: Date = new Date()): boolean {
  if (isClosed(lead) || !lead.nextFollowUpAt) return false;
  return isDueToday(lead, now);
}

function activityTime(lead: LeadListItem): number {
  const at = lead.lastDiscussion?.createdAt ?? lead.createdAt;
  return new Date(at).getTime();
}

export function partitionLeads(
  leads: LeadListItem[],
  now: Date = new Date(),
): { pinned: LeadListItem[]; others: LeadListItem[] } {
  const pinned = leads
    .filter((l) => isPinned(l, now))
    .sort(
      (a, b) =>
        new Date(a.nextFollowUpAt as string).getTime() -
        new Date(b.nextFollowUpAt as string).getTime(),
    );
  const pinnedIds = new Set(pinned.map((l) => l.id));
  const others = leads
    .filter((l) => !pinnedIds.has(l.id))
    .sort((a, b) => activityTime(b) - activityTime(a));
  return { pinned, others };
}
