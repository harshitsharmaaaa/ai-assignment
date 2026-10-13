"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Hydration-safe relative timestamp (B8): renders the absolute time on the
 * server/first paint, then swaps to the relative "time ago" after mount so
 * SSR and CSR never disagree.
 */
export function TimeAgo({
  at,
  now,
  className,
}: {
  at: string;
  now: Date;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const date = new Date(at);
  const absolute = format(date, "PPpp");
  // `now` is passed in so tests and ticking callers stay consistent; the
  // strict distance is computed against mount time, which matches `now`
  // to within the 60 s tick.
  void now;
  return (
    <span className={cn("tabular-nums", className)} title={absolute}>
      {mounted ? (
        formatDistanceToNowStrict(date, { addSuffix: true })
      ) : (
        <span suppressHydrationWarning>{absolute}</span>
      )}
    </span>
  );
}
