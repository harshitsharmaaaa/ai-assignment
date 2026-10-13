"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { LeadListItem } from "@leadflow/shared";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { cn } from "@/lib/utils";
import { isDueToday, isOverdue } from "@/lib/lead-utils";

type Props = {
  lead: LeadListItem;
  now: Date;
  onOpen: (leadId: string) => void;
};

function followUpLabel(lead: LeadListItem): string | null {
  if (!lead.nextFollowUpAt) return null;
  const at = new Date(lead.nextFollowUpAt);
  if (isOverdue(lead)) {
    return `Overdue · ${formatDistanceToNowStrict(at, { addSuffix: true })}`;
  }
  if (isDueToday(lead)) {
    return `Today · ${format(at, "h:mm a")}`;
  }
  return `Follow up ${format(at, "MMM d · h:mm a")}`;
}

export function LeadRow({ lead, now, onOpen }: Props) {
  const overdue = isOverdue(lead, now);
  const followUp = followUpLabel(lead);
  const last = lead.lastDiscussion;

  return (
    <button
      type="button"
      onClick={() => onOpen(lead.id)}
      aria-label={`Open timeline for ${lead.name}`}
      className={cn(
        "w-full rounded-lg border bg-card p-4 text-left shadow-xs transition-colors",
        "hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        overdue && "border-l-4 border-l-red-500",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{lead.name}</span>
        {lead.company && <span className="text-sm text-muted-foreground">{lead.company}</span>}
        <span className="ml-auto">
          <StatusBadge status={lead.status} />
        </span>
      </div>

      {last ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{last.note}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground italic">No discussions yet</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {last && (
          <span className="text-muted-foreground" title={format(new Date(last.createdAt), "PPpp")}>
            {formatDistanceToNowStrict(new Date(last.createdAt), { addSuffix: true })}
          </span>
        )}
        {followUp && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
            {followUp}
          </span>
        )}
      </div>
    </button>
  );
}
