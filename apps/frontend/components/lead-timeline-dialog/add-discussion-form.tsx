"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createDiscussionSchema } from "@leadflow/shared";
import { ApiError } from "@/lib/api-client";
import { useAddDiscussion } from "@/hooks/use-discussions";
import {
  FOLLOW_UP_PRESETS,
  localInputToIso,
  toLocalInputValue,
} from "@/lib/followup-presets";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FieldErrors = { note?: string; followUpAt?: string };

const NOTE_LIMIT = 2000;

function toLocalInputMin(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function AddDiscussionForm({ leadId }: { leadId: string }) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const addDiscussion = useAddDiscussion(leadId);
  // B3: compute once per mount so the hint doesn't drift while typing.
  const minHint = useMemo(() => toLocalInputMin(), []);

  const remaining = NOTE_LIMIT - note.length;
  const counterTone =
    remaining < 0
      ? "text-red-700 dark:text-red-300"
      : remaining <= 100
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground";

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
    if (addDiscussion.isPending) return; // B4: double-submit guard.

    let followUpIso: string | undefined;
    if (followUp) {
      const iso = localInputToIso(followUp);
      if (!iso) {
        setErrors({ followUpAt: "Enter a valid date and time" });
        return;
      }
      followUpIso = iso;
    }

    const parsed = createDiscussionSchema.safeParse({
      note,
      ...(followUpIso ? { followUpAt: followUpIso } : {}),
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

  function applyPreset(id: string): void {
    const preset = FOLLOW_UP_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setFollowUp(toLocalInputValue(preset.compute(new Date())));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t bg-background pt-3">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="discussion-note">Log a call or note</Label>
          <span className={cn("text-xs tabular-nums", counterTone)} aria-live="polite">
            {note.length}/{NOTE_LIMIT}
          </span>
        </div>
        <Textarea
          id="discussion-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter saves; plain Enter inserts a newline.
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="What was discussed? Press Ctrl+Enter to save."
          rows={3}
          maxLength={NOTE_LIMIT + 100}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? "discussion-note-error" : undefined}
        />
        {errors.note && (
          <p id="discussion-note-error" className="text-sm text-destructive">
            {errors.note}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="discussion-follow-up">Follow-up (optional)</Label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Follow-up presets">
            {FOLLOW_UP_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="discussion-follow-up"
              type="datetime-local"
              value={followUp}
              min={minHint}
              onChange={(e) => setFollowUp(e.target.value)}
              aria-invalid={errors.followUpAt ? true : undefined}
              aria-describedby={errors.followUpAt ? "discussion-follow-up-error" : undefined}
            />
            {errors.followUpAt && (
              <p id="discussion-follow-up-error" className="mt-1 text-sm text-destructive">
                {errors.followUpAt}
              </p>
            )}
          </div>
          <Button type="submit" disabled={addDiscussion.isPending || note.trim() === ""}>
            {addDiscussion.isPending && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            {addDiscussion.isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>
    </form>
  );
}
