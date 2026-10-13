"use client";

import { toast } from "sonner";
import type { LeadListItem } from "@leadflow/shared";
import { useUpdateLead } from "@/hooks/use-leads";
import { apiErrorMessage } from "@/lib/api-client";
import { SNOOZE_ACTIONS } from "@/lib/followup-presets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  lead: Pick<LeadListItem, "id" | "name" | "nextFollowUpAt">;
  compact?: boolean;
};

/**
 * One-click follow-up actions (F1): snooze via PATCH `nextFollowUpAt`,
 * with an Undo toast (F6) that patches the previous value back.
 */
export function QuickFollowUp({ lead, compact = false }: Props) {
  const updateLead = useUpdateLead();
  const busy = updateLead.isPending;

  function apply(next: string | null, successMessage: string): void {
    const previous = lead.nextFollowUpAt;
    updateLead.mutate(
      { id: lead.id, input: { nextFollowUpAt: next } },
      {
        onSuccess: () => {
          toast.success(successMessage, {
            action: {
              label: "Undo",
              onClick: () => {
                updateLead.mutate(
                  { id: lead.id, input: { nextFollowUpAt: previous } },
                  {
                    onSuccess: () => toast.success("Follow-up restored"),
                    onError: (err) =>
                      toast.error(apiErrorMessage(err, "Could not restore the follow-up")),
                  },
                );
              },
            },
          });
        },
      },
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={`Quick follow-up actions for ${lead.name}`}
    >
      <span className="text-xs text-muted-foreground">Snooze:</span>
      {SNOOZE_ACTIONS.map((action) => {
        if (action.id === "clear" && !lead.nextFollowUpAt) return null;
        return (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size={compact ? "xs" : "sm"}
            disabled={busy}
            onClick={() => {
              const next = action.compute(new Date());
              apply(
                next ? next.toISOString() : null,
                next ? `Follow-up set to ${action.label}` : "Follow-up cleared",
              );
            }}
            className={cn(action.id === "clear" && "text-muted-foreground")}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
