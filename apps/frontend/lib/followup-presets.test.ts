import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  in3Days9am,
  localInputToIso,
  nextMonday9am,
  nextWeekSameTime,
  plus1Hour,
  toLocalInputValue,
  tomorrow9am,
} from "./followup-presets";

// Fixed local Tuesday noon: deterministic in any machine timezone.
const NOW = new Date(2026, 9, 13, 12, 0, 0); // Oct 13 2026 is a Tuesday

describe("follow-up presets", () => {
  it("tomorrow9am is tomorrow at 9:00 local", () => {
    const d = tomorrow9am(NOW);
    assert.equal(d.getDate(), 14);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 0);
  });

  it("in3Days9am is 3 days out at 9:00 local", () => {
    const d = in3Days9am(NOW);
    assert.equal(d.getDate(), 16);
    assert.equal(d.getHours(), 9);
  });

  it("nextMonday9am from a Tuesday is the coming Monday at 9:00", () => {
    const d = nextMonday9am(NOW);
    assert.equal(d.getDay(), 1); // Monday
    assert.equal(d.getDate(), 19);
    assert.equal(d.getHours(), 9);
  });

  it("nextMonday9am from a Monday is 7 days out (not today)", () => {
    const monday = new Date(2026, 9, 12, 12, 0, 0);
    const d = nextMonday9am(monday);
    assert.equal(d.getDay(), 1);
    assert.equal(d.getDate(), 19);
  });

  it("plus1Hour adds exactly one hour", () => {
    assert.equal(plus1Hour(NOW).getTime(), NOW.getTime() + 3_600_000);
  });

  it("nextWeekSameTime adds exactly 7 days", () => {
    assert.equal(nextWeekSameTime(NOW).getTime(), NOW.getTime() + 7 * 24 * 3_600_000);
  });
});

describe("datetime-local conversion", () => {
  it("round-trips through toLocalInputValue", () => {
    const original = new Date(2026, 9, 14, 9, 30, 0);
    const input = toLocalInputValue(original);
    assert.match(input, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const iso = localInputToIso(input);
    assert.ok(iso);
    assert.equal(new Date(iso as string).getTime(), original.getTime());
  });

  it("returns null for empty/invalid input", () => {
    assert.equal(localInputToIso(""), null);
    assert.equal(localInputToIso("not-a-date"), null);
  });
});
