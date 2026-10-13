"use client";

import { format } from "date-fns";
import { toast } from "sonner";
import type { LeadListItem, LeadStatus } from "@leadflow/shared";
import { useDiscussions } from "@/hooks/use-discussions";
import { useUpdateLead } from "@/hooks/use-leads";
import { apiErrorMessage } from "@/lib/api-client";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddDiscussionForm } from "./add-discussion-form";
import { TimelineItem } from "./timeline-item";

type Props = {
  lead: LeadListItem | null;
  leadId: string | null;
  onClose: () => void;
};

export function LeadTimelineDialog({ lead, leadId, onClose }: Props) {
  const open = leadId !== null;
  const { data: discussions, isPending, isError, error, refetch } = useDiscussions(leadId);
  const updateLead = useUpdateLead();

  function handleStatusChange(status: LeadStatus): void {
    if (!leadId || lead?.status === status) return;
    updateLead.mutate(
      { id: leadId, input: { status } },
      { onSuccess: () => toast.success(`Status updated to ${LEAD_STATUS_LABELS[status]}`) },
    );
  }

  function handleClearFollowUp(): void {
    if (!leadId) return;
    updateLead.mutate(
      { id: leadId, input: { nextFollowUpAt: null } },
      { onSuccess: () => toast.success("Follow-up cleared") },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead?.name ?? "Lead"}</DialogTitle>
          <DialogDescription>
            {[lead?.company, lead?.phone].filter(Boolean).join(" · ") || "Lead timeline"}
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="lead-status">Status</Label>
              <Select
                value={lead.status}
                onValueChange={(v) => handleStatusChange(v as LeadStatus)}
                disabled={updateLead.isPending}
              >
                <SelectTrigger id="lead-status" className="w-40" aria-label="Change lead status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm">
              {lead.nextFollowUpAt ? (
                <span>
                  <span className="text-muted-foreground">Follow-up: </span>
                  {format(new Date(lead.nextFollowUpAt), "MMM d, yyyy h:mm a")}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-1.5 py-0"
                    disabled={updateLead.isPending}
                    onClick={handleClearFollowUp}
                  >
                    Clear
                  </Button>
                </span>
              ) : (
                <span className="text-muted-foreground">No follow-up set</span>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <div className="space-y-2" aria-label="Loading discussions">
              {[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border p-4 text-center" role="alert">
              <p className="text-sm font-medium">Could not load discussions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {apiErrorMessage(error, "Something went wrong.")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : discussions.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No discussions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {discussions.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {leadId && <AddDiscussionForm leadId={leadId} />}
      </DialogContent>
    </Dialog>
  );
}
