import type { LeadStatus } from "@leadflow/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_BADGE_CLASSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(LEAD_STATUS_BADGE_CLASSES[status], className)}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
