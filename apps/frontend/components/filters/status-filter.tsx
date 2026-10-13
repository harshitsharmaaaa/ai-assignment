"use client";

import type { LeadStatus } from "@leadflow/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

export type StatusValue = LeadStatus | "ALL";

type Props = {
  value: StatusValue;
  onChange: (status: StatusValue) => void;
  counts?: Partial<Record<StatusValue, number>>;
};

export function StatusFilter({ value, onChange, counts }: Props) {
  return (
    <div
      role="group"
      aria-label="Filter leads by status"
      className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 sm:flex-wrap sm:overflow-visible"
    >
      <FilterButton
        active={value === "ALL"}
        onClick={() => onChange("ALL")}
        count={counts?.ALL}
      >
        All
      </FilterButton>
      {LEAD_STATUS_OPTIONS.map((opt) => (
        <FilterButton
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
          count={counts?.[opt.value]}
        >
          {LEAD_STATUS_LABELS[opt.value as LeadStatus]}
        </FilterButton>
      ))}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full tabular-nums transition-colors duration-150",
        !active && "text-muted-foreground",
        active && "shadow-sm",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          aria-label={`${count} leads`}
          className={cn(
            "ml-0.5 rounded-full px-1 text-xs tabular-nums",
            active ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      )}
    </Button>
  );
}
