"use client";

import { format } from "date-fns";
import type { DiscussionItem } from "@leadflow/shared";
import { TimeAgo } from "@/components/time-ago";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export function TimelineItem({ item, isNew }: { item: DiscussionItem; isNew?: boolean }) {
  const now = useNow();
  const at = new Date(item.createdAt);
  return (
    <li className={cn("relative pb-2 pl-6 last:pb-0", isNew && "animate-enter")}>
      {/* Rail segment: full item height so adjacent segments join into one
          continuous line. Centered (x=10px) exactly under the dot. */}
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-[9px] w-[2px] bg-border"
      />
      {/* Dot: 10px wide at x=5px, so its center (x=10px) sits on the rail. */}
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
