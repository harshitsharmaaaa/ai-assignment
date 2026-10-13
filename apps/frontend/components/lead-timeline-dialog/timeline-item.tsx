"use client";

import { format } from "date-fns";
import type { DiscussionItem } from "@leadflow/shared";
import { TimeAgo } from "@/components/time-ago";
import { useNow } from "@/hooks/use-now";

export function TimelineItem({ item, isNew }: { item: DiscussionItem; isNew?: boolean }) {
  const now = useNow();
  const at = new Date(item.createdAt);
  return (
    <li
      className={
        isNew
          ? "animate-enter relative pl-6"
          : "relative pl-6"
      }
    >
      <span
        aria-hidden="true"
        className="absolute top-4 left-[5px] h-2.5 w-2.5 rounded-full border-2 border-primary bg-background"
      />
      <div className="rounded-[var(--radius-md)] border bg-card p-3 shadow-[var(--shadow-sm)]">
        <p className="text-sm break-words whitespace-pre-wrap break-anywhere">{item.note}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          <TimeAgo at={item.createdAt} now={now} />
          <span className="ml-1.5 tabular-nums">· {format(at, "MMM d, yyyy h:mm a")}</span>
        </p>
      </div>
    </li>
  );
}
