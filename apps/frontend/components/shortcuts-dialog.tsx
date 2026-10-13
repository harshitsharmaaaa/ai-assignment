"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "/", action: "Focus search" },
  { keys: "N", action: "New lead" },
  { keys: "J / K", action: "Move between leads" },
  { keys: "Enter", action: "Open focused lead" },
  { keys: "Esc", action: "Close dialog" },
  { keys: "?", action: "This help" },
  { keys: "Ctrl+Enter", action: "Save note (in timeline)" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard aria-hidden="true" className="h-4 w-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed through the pipeline without touching the mouse.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs tabular-nums">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
