"use client";

import type { LeadStatus } from "@leadflow/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

type Props = {
  value: LeadStatus | "ALL";
  onChange: (status: LeadStatus | "ALL") => void;
};

export function StatusFilter({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Filter leads by status"
      className="flex flex-wrap gap-1.5"
    >
      <FilterButton active={value === "ALL"} onClick={() => onChange("ALL")}>
        All
      </FilterButton>
      {LEAD_STATUS_OPTIONS.map((opt) => (
        <FilterButton key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className={cn(!active && "text-muted-foreground")}
    >
      {children}
    </Button>
  );
}
