import type { LeadStatus } from "@leadflow/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_BADGE_CLASSES,
  LEAD_STATUS_DOT_CLASSES,
  LEAD_STATUS_LABELS,
} from "@/lib/lead-status";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(LEAD_STATUS_BADGE_CLASSES[status], className)}>
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", LEAD_STATUS_DOT_CLASSES[status])}
      />
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
