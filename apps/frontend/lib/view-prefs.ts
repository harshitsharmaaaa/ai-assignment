"use client";

import type { LeadStatus } from "@leadflow/shared";
import type { LeadSortKey } from "./lead-sort";

export type Density = "comfortable" | "compact";

export type ViewPrefs = {
  status: LeadStatus | "ALL";
  sort: LeadSortKey;
  density: Density;
  overdueOnly: boolean;
};

export const DEFAULT_VIEW_PREFS: ViewPrefs = {
  status: "ALL",
  sort: "activity",
  density: "comfortable",
  overdueOnly: false,
};

const STORAGE_KEY = "leadflow:view-prefs:v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Pure parser (unit-testable): sanitize unknown stored data into ViewPrefs. */
export function parseViewPrefs(raw: unknown): ViewPrefs {
  if (!isRecord(raw)) return { ...DEFAULT_VIEW_PREFS };
  const status = raw.status;
  const sort = raw.sort;
  const density = raw.density;
  const overdueOnly = raw.overdueOnly;
  return {
    status:
      status === "ALL" ||
      (typeof status === "string" &&
        ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"].includes(status))
        ? (status as ViewPrefs["status"])
        : DEFAULT_VIEW_PREFS.status,
    sort: sort === "name" || sort === "followup" || sort === "activity" ? sort : "activity",
    density: density === "compact" ? "compact" : "comfortable",
    overdueOnly: overdueOnly === true,
  };
}

export function loadViewPrefs(): ViewPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VIEW_PREFS };
    return parseViewPrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_VIEW_PREFS };
  }
}

export function saveViewPrefs(prefs: ViewPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full/blocked (private mode): prefs simply don't persist.
  }
}
