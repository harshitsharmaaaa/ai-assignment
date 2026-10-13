import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LeadListItem, LeadStatus } from "@leadflow/shared";
import {
  isDueToday,
  isOverdue,
  isPinned,
  partitionLeads,
} from "./lead-utils";

const HOUR = 3_600_000;
// Fixed local noon: deterministic in any machine timezone.
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

const iso = (d: Date): string => d.toISOString();
const at = (hours: number): string => iso(new Date(NOW.getTime() + hours * HOUR));

describe("isDueToday", () => {
  it("is true for a follow-up later today", () => {
    assert.equal(isDueToday(lead({ nextFollowUpAt: at(3) }), NOW), true);
  });
  it("is true for a follow-up earlier today", () => {
    assert.equal(isDueToday(lead({ nextFollowUpAt: at(-2) }), NOW), true);
  });
  it("is false for yesterday, tomorrow, and null", () => {
    assert.equal(isDueToday(lead({ nextFollowUpAt: at(-26) }), NOW), false);
    assert.equal(isDueToday(lead({ nextFollowUpAt: at(26) }), NOW), false);
    assert.equal(isDueToday(lead({ nextFollowUpAt: null }), NOW), false);
  });
});

describe("isOverdue", () => {
  it("is true for a past follow-up on an open lead", () => {
    assert.equal(isOverdue(lead({ nextFollowUpAt: at(-2) }), NOW), true);
  });
  it("is false for a future follow-up and for null", () => {
    assert.equal(isOverdue(lead({ nextFollowUpAt: at(3) }), NOW), false);
    assert.equal(isOverdue(lead({ nextFollowUpAt: null }), NOW), false);
  });
  it("is never true for WON or LOST leads", () => {
    assert.equal(
      isOverdue(lead({ status: "WON", nextFollowUpAt: at(-100) }), NOW),
      false,
    );
    assert.equal(
      isOverdue(lead({ status: "LOST", nextFollowUpAt: at(-100) }), NOW),
      false,
    );
  });
});

describe("isPinned", () => {
  it("pins leads due later today", () => {
    assert.equal(isPinned(lead({ nextFollowUpAt: at(3) }), NOW), true);
  });
  it("pins leads due earlier today (also overdue)", () => {
    const l = lead({ nextFollowUpAt: at(-2) });
    assert.equal(isPinned(l, NOW), true);
    assert.equal(isOverdue(l, NOW), true);
  });
  it("does not pin previous-day, future, null, or closed leads", () => {
    assert.equal(isPinned(lead({ nextFollowUpAt: at(-26) }), NOW), false);
    assert.equal(isPinned(lead({ nextFollowUpAt: at(26) }), NOW), false);
    assert.equal(isPinned(lead({ nextFollowUpAt: null }), NOW), false);
    assert.equal(isPinned(lead({ status: "WON", nextFollowUpAt: at(1) }), NOW), false);
    assert.equal(isPinned(lead({ status: "LOST", nextFollowUpAt: at(1) }), NOW), false);
  });
});

describe("partitionLeads", () => {
  it("splits pinned/others with no duplicates, pinned sorted ascending", () => {
    const early = lead({
      id: "early",
      status: "QUALIFIED",
      nextFollowUpAt: at(-1),
      lastDiscussion: { note: "x", createdAt: at(-2) },
    });
    const late = lead({
      id: "late",
      status: "CONTACTED",
      nextFollowUpAt: at(3),
      lastDiscussion: { note: "y", createdAt: at(-1) },
    });
    const other = lead({
      id: "other",
      nextFollowUpAt: at(-72),
      lastDiscussion: { note: "z", createdAt: at(-70) },
    });
    const { pinned, others } = partitionLeads([late, other, early], NOW);
    assert.deepEqual(
      pinned.map((l) => l.id),
      ["early", "late"],
    );
    assert.deepEqual(
      others.map((l) => l.id),
      ["other"],
    );
  });

  it("orders others by most recent activity, falling back to createdAt", () => {
    const withDiscussion = lead({
      id: "with-discussion",
      createdAt: at(-100),
      lastDiscussion: { note: "recent", createdAt: at(-1) },
    });
    const withoutDiscussion = lead({ id: "no-discussion", createdAt: at(-2) });
    const { pinned, others } = partitionLeads([withoutDiscussion, withDiscussion], NOW);
    assert.deepEqual(pinned, []);
    assert.deepEqual(
      others.map((l) => l.id),
      ["with-discussion", "no-discussion"],
    );
  });
});
