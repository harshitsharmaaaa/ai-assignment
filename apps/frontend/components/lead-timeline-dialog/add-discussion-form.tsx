"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createDiscussionSchema } from "@leadflow/shared";
import { ApiError } from "@/lib/api-client";
import { useAddDiscussion } from "@/hooks/use-discussions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FieldErrors = { note?: string; followUpAt?: string };

function toLocalInputMin(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function AddDiscussionForm({ leadId }: { leadId: string }) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const addDiscussion = useAddDiscussion(leadId);

  function serverDetailsToFields(details: unknown): FieldErrors {
    if (!Array.isArray(details)) return {};
    const fields: FieldErrors = {};
    for (const item of details as { path?: string; message?: string }[]) {
      if (typeof item?.path !== "string" || typeof item?.message !== "string") continue;
      const field = item.path.replace(/^body\./, "");
      if (field === "note" || field.startsWith("note")) fields.note = item.message;
      else if (field === "followUpAt" || field.startsWith("followUpAt"))
        fields.followUpAt = item.message;
    }
    return fields;
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const parsed = createDiscussionSchema.safeParse({
      note,
      ...(followUp ? { followUpAt: new Date(followUp).toISOString() } : {}),
    });
    if (!parsed.success) {
      const fields: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key === "note") fields.note = issue.message;
        else if (key === "followUpAt") fields.followUpAt = issue.message;
      }
      setErrors(fields);
      return;
    }
    setErrors({});
    addDiscussion.mutate(parsed.data, {
      onSuccess: () => {
        setNote("");
        setFollowUp("");
        toast.success("Note saved");
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const fields = serverDetailsToFields(err.details);
          if (Object.keys(fields).length > 0) setErrors(fields);
        }
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="discussion-note">Add a note</Label>
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {note.length}/2000
          </span>
        </div>
        <Textarea
          id="discussion-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was discussed?"
          rows={3}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? "discussion-note-error" : undefined}
        />
        {errors.note && (
          <p id="discussion-note-error" className="text-sm text-destructive">
            {errors.note}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="discussion-follow-up">Follow-up date &amp; time (optional)</Label>
          <Input
            id="discussion-follow-up"
            type="datetime-local"
            value={followUp}
            min={toLocalInputMin()}
            onChange={(e) => setFollowUp(e.target.value)}
            aria-invalid={errors.followUpAt ? true : undefined}
            aria-describedby={errors.followUpAt ? "discussion-follow-up-error" : undefined}
          />
          {errors.followUpAt && (
            <p id="discussion-follow-up-error" className="text-sm text-destructive">
              {errors.followUpAt}
            </p>
          )}
        </div>
        <Button type="submit" disabled={addDiscussion.isPending || note.trim() === ""}>
          {addDiscussion.isPending && (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          )}
          {addDiscussion.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
