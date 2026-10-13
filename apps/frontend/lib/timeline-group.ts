import { format, isSameDay } from "date-fns";
import type { DiscussionItem } from "@leadflow/shared";

export type TimelineDayGroup = {
  /** `yyyy-MM-dd` local day key. */
  key: string;
  /** Representative date for the sticky label. */
  date: Date;
  /** Sticky label, e.g. "Today", "Yesterday", "Oct 10, 2026". */
  label: string;
  items: DiscussionItem[];
};

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

/**
 * Group newest-first discussions by local calendar day, preserving the
 * incoming (newest-first) order inside each group.
 */
export function groupDiscussionsByDay(
  discussions: DiscussionItem[],
  now: Date = new Date(),
): TimelineDayGroup[] {
  const groups: TimelineDayGroup[] = [];
  for (const item of discussions) {
    const date = new Date(item.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, date, label: dayLabel(date, now), items: [item] });
    }
  }
  return groups;
}
