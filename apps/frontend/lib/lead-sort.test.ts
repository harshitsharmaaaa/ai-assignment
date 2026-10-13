import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LeadListItem, LeadStatus } from "@leadflow/shared";
import { sortOthers } from "./lead-sort";

const HOUR = 3_600_000;
const NOW = new Date(2026, 9, 13, 12, 0, 0);

function lead(overrides: Partial<LeadListItem> = {}): LeadListItem {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Test",
    company: null,
    phone: null,
    status: "NEW" as LeadStatus,
    nextFollowUpAt: null,
    createdAt: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
    updatedAt: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
    lastDiscussion: null,
    ...overrides,
  };
}

const iso = (ms: number): string => new Date(ms).toISOString();

describe("sortOthers", () => {
  it("activity: most recent first, falling back to createdAt", () => {
    const old = lead({ id: "old", lastDiscussion: { note: "o", createdAt: iso(+NOW - 10 * HOUR) } });
    const recent = lead({ id: "recent", lastDiscussion: { note: "r", createdAt: iso(+NOW - HOUR) } });
    const noDisc = lead({ id: "nodisc", createdAt: iso(+NOW - 2 * HOUR) });
    assert.deepEqual(
      sortOthers([old, noDisc, recent], "activity").map((l) => l.id),
      ["recent", "nodisc", "old"],
    );
  });

  it("name: case-insensitive alphabetical", () => {
    const b = lead({ id: "b", name: "bravo" });
    const a = lead({ id: "a", name: "Alpha" });
    const c = lead({ id: "c", name: "charlie" });
    assert.deepEqual(
      sortOthers([b, c, a], "name").map((l) => l.id),
      ["a", "b", "c"],
    );
  });

  it("followup: earliest follow-up first, none last", () => {
    const none = lead({ id: "none", nextFollowUpAt: null });
    const later = lead({ id: "later", nextFollowUpAt: iso(+NOW + 5 * HOUR) });
    const sooner = lead({ id: "sooner", nextFollowUpAt: iso(+NOW + HOUR) });
    assert.deepEqual(
      sortOthers([none, later, sooner], "followup").map((l) => l.id),
      ["sooner", "later", "none"],
    );
  });

  it("does not mutate the input array", () => {
    const a = lead({ id: "a", name: "b" });
    const b = lead({ id: "b", name: "a" });
    const input = [a, b];
    sortOthers(input, "name");
    assert.deepEqual(
      input.map((l) => l.id),
      ["a", "b"],
    );
  });
});
