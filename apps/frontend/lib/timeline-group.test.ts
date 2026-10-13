import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DiscussionItem } from "@leadflow/shared";
import { groupDiscussionsByDay } from "./timeline-group";

const NOW = new Date(2026, 9, 13, 12, 0, 0); // Tuesday noon local

function item(id: string, at: Date): DiscussionItem {
  return { id, leadId: "lead-1", note: `note ${id}`, createdAt: at.toISOString() };
}

describe("groupDiscussionsByDay", () => {
  it("groups newest-first items by local day with Today/Yesterday labels", () => {
    const items = [
      item("a", new Date(2026, 9, 13, 11, 0, 0)),
      item("b", new Date(2026, 9, 13, 9, 0, 0)),
      item("c", new Date(2026, 9, 12, 18, 0, 0)),
      item("d", new Date(2026, 9, 10, 8, 0, 0)),
    ];
    const groups = groupDiscussionsByDay(items, NOW);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].label, "Today");
    assert.deepEqual(
      groups[0].items.map((i) => i.id),
      ["a", "b"],
    );
    assert.equal(groups[1].label, "Yesterday");
    assert.deepEqual(
      groups[1].items.map((i) => i.id),
      ["c"],
    );
    assert.match(groups[2].label, /Oct 10/);
  });

  it("returns empty for no discussions", () => {
    assert.deepEqual(groupDiscussionsByDay([], NOW), []);
  });
});
