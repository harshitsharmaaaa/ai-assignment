"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownWideNarrow, Plus } from "lucide-react";
import { AddLeadDialog } from "@/components/add-lead-dialog/add-lead-dialog";
import { StatusFilter, type StatusValue } from "@/components/filters/status-filter";
import { SearchInput } from "@/components/filters/search-input";
import { LeadList } from "@/components/lead-list/lead-list";
import { LeadTimelineDialog } from "@/components/lead-timeline-dialog/lead-timeline-dialog";
import { PipelineSummary } from "@/components/pipeline-summary";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";
import { isOverdue, isPinned } from "@/lib/lead-utils";
import { LEAD_SORT_OPTIONS, type LeadSortKey } from "@/lib/lead-sort";
import type { LeadFilters } from "@/lib/query-keys";
import {
  DEFAULT_VIEW_PREFS,
  loadViewPrefs,
  saveViewPrefs,
  type Density,
} from "@/lib/view-prefs";
import { cn } from "@/lib/utils";

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

export function LeadsScreen() {
  const [prefs, setPrefs] = useState(() =>
    typeof window === "undefined" ? { ...DEFAULT_VIEW_PREFS } : loadViewPrefs(),
  );
  const [searchInput, setSearchInput] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<string | null>(null);

  // Debounced so typing does not refetch on every keystroke.
  const search = useDebouncedValue(searchInput, 300);
  const filters: LeadFilters = useMemo(
    () => ({ status: prefs.status, search }),
    [prefs.status, search],
  );

  // Header data always comes from the live list cache, so status and
  // follow-up edits reflect instantly while the dialog is open. The dialog
  // itself falls back to a snapshot + direct fetch (B1) when the filter
  // no longer matches.
  const { data: leads } = useLeads(filters);
  const selectedLead = leads?.find((l) => l.id === selectedLeadId) ?? null;

  // Unfiltered counts for the pipeline strip + status chips.
  const now = useNow();
  const { data: allLeads } = useLeads({ status: "ALL", search: "" });
  const counts = useMemo(() => {
    const c: Partial<Record<StatusValue, number>> = { ALL: allLeads?.length ?? 0 };
    for (const opt of LEAD_STATUS_OPTIONS) c[opt.value] = 0;
    for (const lead of allLeads ?? []) {
      c[lead.status] = (c[lead.status] ?? 0) + 1;
    }
    return c;
  }, [allLeads]);
  const { todayCount, overdueCount } = useMemo(() => {
    let today = 0;
    let overdue = 0;
    for (const lead of allLeads ?? []) {
      if (isPinned(lead, now)) today += 1;
      if (isOverdue(lead, now)) overdue += 1;
    }
    return { todayCount: today, overdueCount: overdue };
  }, [allLeads, now]);

  // Persist view prefs (filter, sort, density, overdue toggle).
  useEffect(() => {
    saveViewPrefs(prefs);
  }, [prefs]);

  const openLead = useCallback((id: string) => {
    const active = document.activeElement as HTMLElement | null;
    openerRef.current = active?.closest("[data-lead-id]")?.getAttribute("data-lead-id") ?? id;
    setFocusedId(id);
    setSelectedLeadId(id);
  }, []);

  const closeLead = useCallback(() => {
    setSelectedLeadId(null);
    // B11: return focus to the row that opened the dialog.
    const id = openerRef.current;
    requestAnimationFrame(() => {
      if (!id) return;
      const el = document.querySelector<HTMLButtonElement>(
        `[data-lead-id="${CSS.escape(id)}"] > button`,
      );
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest" });
    });
  }, []);

  function clearAllFilters(): void {
    setPrefs((p) => ({ ...p, status: "ALL", overdueOnly: false }));
    setSearchInput("");
  }

  // Keyboard shortcuts (F5): `/` search, `N` new, `J`/`K` move, `Enter` open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") return; // Radix dialogs own Esc.
      if (isTypingTarget(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "N" || e.key === "n") {
        e.preventDefault();
        setAddOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "Enter" && focusedId && !selectedLeadId && !addOpen) {
        e.preventDefault();
        setSelectedLeadId(focusedId);
      } else if ((e.key === "j" || e.key === "J" || e.key === "k" || e.key === "K") && !selectedLeadId) {
        const rows = Array.from(
          document.querySelectorAll<HTMLButtonElement>("[data-lead-id] > button"),
        );
        if (rows.length === 0) return;
        e.preventDefault();
        const ids = rows.map(
          (b) => b.closest("[data-lead-id]")?.getAttribute("data-lead-id") ?? "",
        );
        const idx = ids.indexOf(focusedId ?? "");
        const next =
          e.key === "j" || e.key === "J"
            ? rows[Math.min(idx + 1, rows.length - 1)] ?? rows[0]
            : rows[Math.max(idx - 1, 0)] ?? rows[rows.length - 1];
        const first = idx === -1 ? (e.key === "j" || e.key === "J" ? rows[0] : rows[rows.length - 1]) : next;
        first?.focus();
        const id = first?.closest("[data-lead-id]")?.getAttribute("data-lead-id") ?? null;
        setFocusedId(id);
        first?.scrollIntoView({ block: "nearest" });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusedId, selectedLeadId, addOpen]);

  function setDensity(density: Density): void {
    setPrefs((p) => ({ ...p, density }));
  }

  function setSort(sort: LeadSortKey): void {
    setPrefs((p) => ({ ...p, sort }));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      <header className="sticky top-0 z-30 -mx-3 border-b bg-background/95 px-3 pt-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">LeadFlow</h1>
            <p className="hidden text-[13px] text-muted-foreground sm:block">
              {todayCount > 0
                ? `${todayCount} follow-up${todayCount === 1 ? "" : "s"} due today`
                : "Every conversation, one screen"}
              {overdueCount > 0 && (
                <span className="font-medium text-red-700 dark:text-red-300">
                  {" · "}{overdueCount} overdue
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              className="hidden sm:inline-flex"
            >
              ?
            </Button>
            <ThemeToggle />
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Lead
              <kbd
                aria-hidden="true"
                className="ml-1 hidden rounded border bg-primary-foreground/15 px-1 font-mono text-[11px] lg:inline"
              >
                N
              </kbd>
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput ref={searchRef} value={searchInput} onChange={setSearchInput} />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ArrowDownWideNarrow aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="lead-sort" className="sr-only">
                  Sort leads
                </Label>
                <Select value={prefs.sort} onValueChange={(v) => setSort(v as LeadSortKey)}>
                  <SelectTrigger id="lead-sort" size="sm" className="w-40" aria-label="Sort leads">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    {LEAD_SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="flex rounded-full border p-0.5"
                role="group"
                aria-label="List density"
              >
                {(["comfortable", "compact"] as Density[]).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-pressed={prefs.density === d}
                    onClick={() => setDensity(d)}
                    className={cn(
                      "rounded-full capitalize",
                      prefs.density === d && "bg-muted text-foreground shadow-xs",
                    )}
                  >
                    {d === "comfortable" ? "Comfort" : "Compact"}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant={prefs.overdueOnly ? "default" : "outline"}
                size="sm"
                aria-pressed={prefs.overdueOnly}
                onClick={() => setPrefs((p) => ({ ...p, overdueOnly: !p.overdueOnly }))}
                className="shrink-0 rounded-full"
              >
                Overdue
                {overdueCount > 0 && (
                  <span className="ml-0.5 text-xs tabular-nums opacity-80">{overdueCount}</span>
                )}
              </Button>
            </div>
          </div>
          <StatusFilter
            value={prefs.status}
            onChange={(s) => setPrefs((p) => ({ ...p, status: s }))}
            counts={counts}
          />
        </div>
      </header>

      <div className="mt-4 space-y-4">
        <PipelineSummary
          counts={counts}
          todayCount={todayCount}
          overdueCount={overdueCount}
          activeStatus={prefs.status}
          overdueOnly={prefs.overdueOnly}
          onSelectStatus={(s) => setPrefs((p) => ({ ...p, status: s }))}
          onToggleOverdue={() => setPrefs((p) => ({ ...p, overdueOnly: !p.overdueOnly }))}
        />

        <LeadList
          filters={filters}
          sort={prefs.sort}
          density={prefs.density}
          overdueOnly={prefs.overdueOnly}
          focusedId={focusedId}
          onOpen={openLead}
          onClearFilters={clearAllFilters}
        />
      </div>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(id) => openLead(id)}
      />
      <LeadTimelineDialog lead={selectedLead} leadId={selectedLeadId} onClose={closeLead} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </main>
  );
}
