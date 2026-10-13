"use client";

import { useState } from "react";
import type { LeadStatus } from "@leadflow/shared";
import { StatusFilter } from "@/components/filters/status-filter";
import { SearchInput } from "@/components/filters/search-input";
import { LeadList } from "@/components/lead-list/lead-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LeadFilters } from "@/lib/query-keys";

export function LeadsScreen() {
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  // Selected lead for the timeline dialog (built in the next phase).
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Debounced so typing does not refetch on every keystroke.
  const search = useDebouncedValue(searchInput, 300);
  const filters: LeadFilters = { status, search };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">LeadFlow</h1>
        <div className="mt-4 flex flex-col gap-3">
          <SearchInput value={searchInput} onChange={setSearchInput} />
          <StatusFilter value={status} onChange={setStatus} />
        </div>
      </header>

      <LeadList filters={filters} onOpen={setSelectedLeadId} />
    </main>
  );
}
