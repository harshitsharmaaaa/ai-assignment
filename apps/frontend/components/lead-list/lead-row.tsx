"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Check, Copy, Phone } from "lucide-react";
import { toast } from "sonner";
import type { LeadListItem } from "@leadflow/shared";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TimeAgo } from "@/components/time-ago";
import type { Density } from "@/lib/view-prefs";
import { cn } from "@/lib/utils";
import { isDueToday, isOverdue } from "@/lib/lead-utils";

type Props = {
  lead: LeadListItem;
  now: Date;
  onOpen: (leadId: string) => void;
  density?: Density;
  focused?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

type FollowUpVariant = "overdue" | "today" | "upcoming" | null;

function followUpState(lead: LeadListItem, now: Date): { variant: FollowUpVariant; label: string | null } {
  if (!lead.nextFollowUpAt) return { variant: null, label: null };
  const at = new Date(lead.nextFollowUpAt);
  if (isOverdue(lead, now)) {
    return { variant: "overdue", label: `Overdue · ${format(at, "MMM d, h:mm a")}` };
  }
  if (isDueToday(lead, now)) {
    return { variant: "today", label: `Today · ${format(at, "h:mm a")}` };
  }
  return { variant: "upcoming", label: `Follow up ${format(at, "MMM d · h:mm a")}` };
}

export function LeadRow({ lead, now, onOpen, density = "comfortable", focused = false }: Props) {
  const overdue = isOverdue(lead, now);
  const { variant, label: followUp } = followUpState(lead, now);
  const last = lead.lastDiscussion;
  const [copied, setCopied] = useState(false);
  const compact = density === "compact";

  async function handleCopyPhone(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!lead.phone) return;
    try {
      await navigator.clipboard.writeText(lead.phone);
      setCopied(true);
      toast.success("Phone number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the phone number");
    }
  }

  return (
    <div
      data-lead-id={lead.id}
      className={cn(
        "group relative rounded-[var(--radius-md)] border bg-card shadow-[var(--shadow-sm)] transition-all duration-150",
        "hover:shadow-[var(--shadow-md)] hover:border-ring/40",
        focused && "border-ring ring-2 ring-ring/50",
        overdue && "border-l-4 border-l-[var(--followup-overdue)]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        aria-label={`Open timeline for ${lead.name}`}
        aria-current={focused ? true : undefined}
        className={cn(
          "block w-full text-left focus-visible:outline-none",
          compact ? "p-2.5" : "p-4",
        )}
      >
        <span className={cn("flex items-center gap-3", compact && "gap-2")}>
          <span
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground",
              compact ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs",
            )}
          >
            {initials(lead.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={cn("font-semibold break-words", compact ? "text-sm" : "text-[15px]")}>
                {lead.name}
              </span>
              <StatusBadge status={lead.status} />
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
              {[lead.company, lead.phone].filter(Boolean).join(" · ") || "No company or phone"}
            </span>
          </span>
        </span>

        {last ? (
          <span
            className={cn(
              "mt-2 block text-sm break-words text-muted-foreground",
              compact ? "line-clamp-1" : "line-clamp-2",
            )}
          >
            {last.note}
          </span>
        ) : (
          <span className="mt-2 block text-sm text-muted-foreground italic">
            No discussions yet
          </span>
        )}

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {last && (
            <TimeAgo at={last.createdAt} now={now} className="text-muted-foreground" />
          )}
          {followUp && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums",
                variant === "overdue" && "bg-red-500/10 text-red-700 dark:text-red-300",
                variant === "today" &&
                  "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                variant === "upcoming" && "bg-muted text-muted-foreground",
              )}
            >
              <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
              {followUp}
            </span>
          )}
        </span>
      </button>

      {lead.phone && (
        <span
          className={cn(
            "absolute flex gap-1 opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "focus-within:opacity-100",
            compact ? "top-2 right-2" : "top-3 right-3",
          )}
        >
          <a
            href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`}
            aria-label={`Call ${lead.name} at ${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border bg-background p-1.5 text-muted-foreground shadow-sm hover:text-foreground focus-visible:opacity-100"
          >
            <Phone aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={handleCopyPhone}
            aria-label={`Copy phone number for ${lead.name}`}
            className="rounded-md border bg-background p-1.5 text-muted-foreground shadow-sm hover:text-foreground"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
        </span>
      )}
    </div>
  );
}
