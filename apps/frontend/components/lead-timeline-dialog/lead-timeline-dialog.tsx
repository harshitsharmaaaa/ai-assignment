"use client";

import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { MessageSquareOff, Phone } from "lucide-react";
import { toast } from "sonner";
import type { LeadListItem, LeadStatus } from "@leadflow/shared";
import { useDiscussions } from "@/hooks/use-discussions";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { apiErrorMessage } from "@/lib/api-client";
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import { groupDiscussionsByDay } from "@/lib/timeline-group";
import { useNow } from "@/hooks/use-now";
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
import { QuickFollowUp } from "@/components/quick-followup";
import { AddDiscussionForm } from "./add-discussion-form";
import { TimelineItem } from "./timeline-item";

type Props = {
  lead: LeadListItem | null;
  leadId: string | null;
  onClose: () => void;
};

export function LeadTimelineDialog({ lead: liveLead, leadId, onClose }: Props) {
  const open = leadId !== null;
  const { data: discussions, isPending, isError, error, refetch } = useDiscussions(leadId);
  const updateLead = useUpdateLead();
  const now = useNow();

  // B1: the header reads the live list, but the active filter/search may not
  // match the open lead (or a mutation moves it out). Keep the last-known
  // snapshot and reconcile with a direct fetch so the header never blanks.
  const snapshotRef = useRef<LeadListItem | null>(null);
  useEffect(() => {
    if (liveLead) snapshotRef.current = liveLead;
  }, [liveLead]);
  useEffect(() => {
    if (!open) snapshotRef.current = null;
  }, [open ]);

  const { data: fetchedLead } = useLead(open ? leadId : null);
  const lead: LeadListItem | null =
    liveLead ?? (fetchedLead ? { ...fetchedLead, lastDiscussion: null } : null) ?? snapshotRef.current;
  const outsideFilter = open && !liveLead && !!lead;

  const groups = useMemo(
    () => groupDiscussionsByDay(discussions ?? [], now),
    [discussions, now],
  );

  function handleStatusChange(status: LeadStatus): void {
    if (!leadId || lead?.status === status) return;
    const previous = lead?.status;
    updateLead.mutate(
      { id: leadId, input: { status } },
      {
        onSuccess: () =>
          toast.success(`Status updated to ${LEAD_STATUS_LABELS[status]}`, {
            action: previous
              ? {
                  label: "Undo",
                  onClick: () => {
                    updateLead.mutate(
                      { id: leadId, input: { status: previous } },
                      {
                        onSuccess: () => toast.success("Status restored"),
                        onError: (err) =>
                          toast.error(apiErrorMessage(err, "Could not restore the status")),
                      },
                    );
                  },
                }
              : undefined,
          }),
      },
    );
  }

  function handleClearFollowUp(): void {
    if (!leadId) return;
    const previous = lead?.nextFollowUpAt ?? null;
    updateLead.mutate(
      { id: leadId, input: { nextFollowUpAt: null } },
      {
        onSuccess: () =>
          toast.success("Follow-up cleared", {
            action: previous
              ? {
                  label: "Undo",
                  onClick: () => {
                    updateLead.mutate(
                      { id: leadId, input: { nextFollowUpAt: previous } },
                      {
                        onSuccess: () => toast.success("Follow-up restored"),
                        onError: (err) =>
                          toast.error(
                            apiErrorMessage(err, "Could not restore the follow-up"),
                          ),
                      },
                    );
                  },
                }
              : undefined,
          }),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] flex-col gap-4 p-4 sm:max-w-xl sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="break-words">
            {lead?.name ?? "Lead"}
          </DialogTitle>
          <DialogDescription className="break-words">
            {[lead?.company, lead?.phone].filter(Boolean).join(" · ") || "Lead timeline"}
          </DialogDescription>
          {outsideFilter && (
            <p className="text-xs text-muted-foreground">
              This lead is outside the current filter — showing its latest saved state.
            </p>
          )}
          {lead?.phone && (
            <p className="text-sm">
              <a
                href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`}
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                Call {lead.phone}
              </a>
            </p>
          )}
        </DialogHeader>

        {lead && (
          <div className="space-y-2.5 rounded-[var(--radius-md)] border bg-muted/40 p-3">
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
                  <SelectContent className="z-[70]">
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
                    <span className="tabular-nums">
                      {format(new Date(lead.nextFollowUpAt), "MMM d, yyyy h:mm a")}
                    </span>
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
            <QuickFollowUp lead={lead} compact />
          </div>
        )}

        <div className="min-h-24 flex-1 overflow-y-auto pr-0.5" aria-live="polite">
          {isPending ? (
            <div className="space-y-2" role="status" aria-label="Loading discussions">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-[var(--radius-md)] border p-3">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-[var(--radius-md)] border p-4 text-center" role="alert">
              <p className="text-sm font-medium">Could not load discussions</p>
              <p className="mt-1 text-xs break-words text-muted-foreground">
                {apiErrorMessage(error, "Something went wrong. Check your connection.")}
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
          ) : groups.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed p-6 text-center">
              <span
                aria-hidden="true"
                className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <MessageSquareOff className="h-4 w-4 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">No activity yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Log the first touch below — it will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label}>
                  <h3 className="sticky top-0 z-10 -mx-0.5 bg-background/95 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
                    {group.label}
                  </h3>
                  <ul className="relative space-y-2 border-l-2 border-muted pl-0">
                    {group.items.map((item, idx) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isNew={group.key === groups[0]?.key && idx === 0}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {leadId && <AddDiscussionForm key={leadId} leadId={leadId} />}
      </DialogContent>
    </Dialog>
  );
}
