"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLeadSchema } from "@leadflow/shared";
import { ApiError } from "@/lib/api-client";
import { useCreateLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (leadId: string) => void;
};

type FieldErrors = { name?: string; company?: string; phone?: string };

function serverDetailsToFields(details: unknown): FieldErrors {
  if (!Array.isArray(details)) return {};
  const fields: FieldErrors = {};
  for (const item of details as { path?: string; message?: string }[]) {
    if (typeof item?.path !== "string" || typeof item?.message !== "string") continue;
    const field = item.path.replace(/^body\./, "");
    if (field === "name" || field === "company" || field === "phone") {
      fields[field] = item.message;
    }
  }
  return fields;
}

export function AddLeadDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const createLead = useCreateLead();

  function reset(): void {
    setName("");
    setCompany("");
    setPhone("");
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const parsed = createLeadSchema.safeParse({ name, company, phone });
    if (!parsed.success) {
      const fields: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key === "name" || key === "company" || key === "phone") fields[key] = issue.message;
      }
      setErrors(fields);
      return;
    }
    setErrors({});
    createLead.mutate(parsed.data, {
      onSuccess: (lead) => {
        toast.success(`Lead "${lead.name}" created`);
        reset();
        onOpenChange(false);
        onCreated(lead.id);
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Create a new lead. Status starts as New.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-lead-name">
              Name <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="new-lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "new-lead-name-error" : undefined}
            />
            {errors.name && (
              <p id="new-lead-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-lead-company">Company</Label>
            <Input
              id="new-lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company (optional)"
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={errors.company ? "new-lead-company-error" : undefined}
            />
            {errors.company && (
              <p id="new-lead-company-error" className="text-sm text-destructive">
                {errors.company}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-lead-phone">Phone</Label>
            <Input
              id="new-lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              inputMode="tel"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "new-lead-phone-error" : undefined}
            />
            {errors.phone && (
              <p id="new-lead-phone-error" className="text-sm text-destructive">
                {errors.phone}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createLead.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              )}
              {createLead.isPending ? "Creating…" : "Create lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
