"use client";

import { AlarmClock, CalendarCheck, KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import type { StatusValue } from "@/components/filters/status-filter";
import { cn } from "@/lib/utils";

type Props = {
  counts: Partial<Record<StatusValue, number>>;
  todayCount: number;
  overdueCount: number;
  activeStatus: StatusValue;
  overdueOnly: boolean;
  onSelectStatus: (s: StatusValue) => void;
  onToggleOverdue: () => void;
};

export function PipelineSummary({
  counts,
  todayCount,
  overdueCount,
  activeStatus,
  overdueOnly,
  onSelectStatus,
  onToggleOverdue,
}: Props) {
  return (
    <div
      aria-label="Pipeline summary"
      className="rounded-[var(--radius-md)] border bg-card p-3 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center gap-1.5 px-1 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
        <KanbanSquare aria-hidden="true" className="h-4 w-4" />
        Pipeline
      </div>
      <div
        className="scrollbar-none -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 py-0.5"
        role="group"
        aria-label="Filter by pipeline stage"
      >
        {LEAD_STATUS_OPTIONS.map((opt) => {
          const active = activeStatus === opt.value && !overdueOnly;
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              aria-pressed={active}
              onClick={() => onSelectStatus(opt.value)}
              className={cn(
                "shrink-0 rounded-full border tabular-nums",
                !active && "text-muted-foreground",
              )}
            >
              {LEAD_STATUS_LABELS[opt.value]}
              <span className="ml-0.5 text-xs tabular-nums opacity-80">
                {counts[opt.value] ?? 0}
              </span>
            </Button>
          );
        })}
        <span aria-hidden="true" className="mx-0.5 w-px shrink-0 self-stretch bg-border" />
        <Button
          type="button"
          size="sm"
          variant={!overdueOnly && activeStatus === "ALL" ? "default" : "ghost"}
          aria-pressed={!overdueOnly && activeStatus === "ALL"}
          onClick={() => {
            if (overdueOnly) onToggleOverdue();
            onSelectStatus("ALL");
          }}
          className="shrink-0 rounded-full border tabular-nums"
        >
          <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Today
          <span className="ml-0.5 text-xs tabular-nums opacity-80">{todayCount}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={overdueOnly ? "default" : "ghost"}
          aria-pressed={overdueOnly}
          onClick={onToggleOverdue}
          className={cn(
            "shrink-0 rounded-full border tabular-nums",
            !overdueOnly && overdueCount > 0 && "text-red-700 dark:text-red-300",
          )}
        >
          <AlarmClock aria-hidden="true" className="h-3.5 w-3.5" />
          Overdue
          <span className="ml-0.5 text-xs tabular-nums opacity-80">{overdueCount}</span>
        </Button>
      </div>
    </div>
  );
}
