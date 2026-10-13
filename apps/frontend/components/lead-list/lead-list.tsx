"use client";

import { useMemo } from "react";
import { CalendarCheck, Layers, Inbox } from "lucide-react";
import type { LeadListItem } from "@leadflow/shared";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-client";
import { isOverdue, partitionLeads } from "@/lib/lead-utils";
import { sortOthers, type LeadSortKey } from "@/lib/lead-sort";
import type { LeadFilters } from "@/lib/query-keys";
import type { Density } from "@/lib/view-prefs";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { LeadRow } from "./lead-row";

type Props = {
  filters: LeadFilters;
  sort: LeadSortKey;
  density: Density;
  overdueOnly: boolean;
  focusedId: string | null;
  onOpen: (leadId: string) => void;
  onClearFilters: () => void;
};

function LoadingSkeleton({ density }: { density: Density }) {
  const compact = density === "compact";
  return (
    <div className="space-y-3" role="status" aria-label="Loading leads">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[var(--radius-md)] border bg-card shadow-[var(--shadow-sm)]"
        >
          <div className={compact ? "p-2.5" : "p-4"}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="mt-3 h-3 w-4/5 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadSection({
  title,
  icon,
  count,
  leads,
  now,
  density,
  focusedId,
  onOpen,
  highlighted,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  leads: LeadListItem[];
  now: Date;
  density: Density;
  focusedId: string | null;
  onOpen: (leadId: string) => void;
  highlighted?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={
        highlighted
          ? "rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/[0.06] p-3 dark:bg-amber-400/[0.06]"
          : ""
      }
    >
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{count}</span>
        )}
      </h2>
      <div className="space-y-2.5">
        {leads.map((lead) => (
          <div key={lead.id} className="animate-enter">
            <LeadRow
              lead={lead}
              now={now}
              onOpen={onOpen}
              density={density}
              focused={focusedId === lead.id}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function LeadList({
  filters,
  sort,
  density,
  overdueOnly,
  focusedId,
  onOpen,
  onClearFilters,
}: Props) {
  const now = useNow();
  const { data, isPending, isError, error, refetch, isFetching } = useLeads(filters);

  const visible = useMemo(() => {
    if (!data) return null;
    const { pinned, others } = partitionLeads(data, now);
    const sortedOthers = sortOthers(others, sort);
    if (!overdueOnly) return { pinned, others: sortedOthers };
    return {
      pinned: pinned.filter((l) => isOverdue(l, now)),
      others: sortedOthers.filter((l) => isOverdue(l, now)),
    };
  }, [data, now, sort, overdueOnly]);

  if (isPending || !visible) return <LoadingSkeleton density={density} />;

  if (isError) {
    return (
      <div
        className="rounded-[var(--radius-md)] border bg-card p-8 text-center shadow-[var(--shadow-sm)]"
        role="alert"
      >
        <p className="font-medium">Could not load leads</p>
        <p className="mx-auto mt-1 max-w-sm text-sm break-words text-muted-foreground">
          {apiErrorMessage(error, "Something went wrong. Check your connection and try again.")}
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const isFiltering =
    filters.status !== "ALL" || filters.search.trim() !== "" || overdueOnly;
  if (visible.pinned.length === 0 && visible.others.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border bg-card p-8 text-center shadow-[var(--shadow-sm)]">
        <span
          aria-hidden="true"
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="font-medium">
          {overdueOnly
            ? "Nothing overdue — nice work."
            : isFiltering
              ? "No leads match your filters"
              : "No leads yet. Add your first lead."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {overdueOnly
            ? "Follow-ups that slip past their due time will show up here."
            : isFiltering
              ? "Try a different search or clear the filters to see everything."
              : "Log your first conversation to get the pipeline moving."}
        </p>
        {isFiltering && (
          <Button type="button" variant="outline" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  const showPinned = visible.pinned.length > 0;

  return (
    <div className="space-y-6" aria-busy={isFetching} aria-live="polite">
      {showPinned && (
        <LeadSection
          title="Today's follow-ups"
          icon={<CalendarCheck aria-hidden="true" className="h-4 w-4" />}
          count={visible.pinned.length}
          leads={visible.pinned}
          now={now}
          density={density}
          focusedId={focusedId}
          onOpen={onOpen}
          highlighted
        />
      )}
      {visible.others.length > 0 && (
        <LeadSection
          title={showPinned ? "All other leads" : overdueOnly ? "Overdue leads" : "Leads"}
          icon={<Layers aria-hidden="true" className="h-4 w-4" />}
          count={visible.others.length}
          leads={visible.others}
          now={now}
          density={density}
          focusedId={focusedId}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
