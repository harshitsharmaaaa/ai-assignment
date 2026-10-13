"use client";

import { useEffect, useState } from "react";

/** Current time, re-rendered on an interval (default 60 s) for relative timestamps. */
export function useNow(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
