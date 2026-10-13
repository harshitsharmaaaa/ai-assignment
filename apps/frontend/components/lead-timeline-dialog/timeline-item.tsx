"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import type { DiscussionItem } from "@leadflow/shared";

export function TimelineItem({ item }: { item: DiscussionItem }) {
  const at = new Date(item.createdAt);
  return (
    <li className="rounded-lg border bg-card p-3">
      <p className="text-sm whitespace-pre-wrap">{item.note}</p>
      <p className="mt-1.5 text-xs text-muted-foreground" title={format(at, "PPpp")}>
        {formatDistanceToNowStrict(at, { addSuffix: true })}
        <span className="ml-1.5">· {format(at, "MMM d, yyyy h:mm a")}</span>
      </p>
    </li>
  );
}
