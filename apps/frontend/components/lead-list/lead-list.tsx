"use client";

import type { LeadListItem } from "@leadflow/shared";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-client";
import { partitionLeads } from "@/lib/lead-utils";
import type { LeadFilters } from "@/lib/query-keys";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { LeadRow } from "./lead-row";

type Props = {
  filters: LeadFilters;
  onOpen: (leadId: string) => void;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading leads">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function LeadSection({
  title,
  count,
  leads,
  now,
  onOpen,
  highlighted,
}: {
  title: string;
  count?: number;
  leads: LeadListItem[];
  now: Date;
  onOpen: (leadId: string) => void;
  highlighted?: boolean;
}) {
  return (
    <section aria-label={title} className={highlighted ? "rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30" : ""}>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
        {count !== undefined && <span className="ml-1.5">({count})</span>}
      </h2>
      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} now={now} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export function LeadList({ filters, onOpen }: Props) {
  const now = useNow();
  const { data, isPending, isError, error, refetch, isFetching } = useLeads(filters);

  if (isPending) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center" role="alert">
        <p className="font-medium">Could not load leads</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {apiErrorMessage(error, "Something went wrong.")}
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const isFiltering = filters.status !== "ALL" || filters.search.trim() !== "";
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="font-medium">
          {isFiltering ? "No leads match your filters" : "No leads yet. Add your first lead."}
        </p>
      </div>
    );
  }

  const { pinned, others } = partitionLeads(data, now);
  const showPinned = pinned.length > 0;

  return (
    <div className="space-y-6" aria-busy={isFetching}>
      {showPinned && (
        <LeadSection
          title="Today's follow-ups"
          count={pinned.length}
          leads={pinned}
          now={now}
          onOpen={onOpen}
          highlighted
        />
      )}
      {others.length > 0 && (
        <LeadSection
          title={showPinned ? "All other leads" : "Leads"}
          leads={others}
          now={now}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
