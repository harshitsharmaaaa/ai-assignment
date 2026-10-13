import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VIEW_PREFS, parseViewPrefs } from "./view-prefs";

describe("parseViewPrefs", () => {
  it("accepts a full valid object", () => {
    assert.deepEqual(
      parseViewPrefs({ status: "WON", sort: "name", density: "compact", overdueOnly: true }),
      { status: "WON", sort: "name", density: "compact", overdueOnly: true },
    );
  });

  it("falls back to defaults for garbage", () => {
    assert.deepEqual(parseViewPrefs(null), DEFAULT_VIEW_PREFS);
    assert.deepEqual(parseViewPrefs("nope"), DEFAULT_VIEW_PREFS);
    assert.deepEqual(
      parseViewPrefs({ status: "BOGUS", sort: "bogus", density: "x", overdueOnly: "yes" }),
      DEFAULT_VIEW_PREFS,
    );
  });

  it("keeps valid fields and resets invalid ones", () => {
    assert.deepEqual(parseViewPrefs({ status: "NEW", sort: "bogus" }), {
      ...DEFAULT_VIEW_PREFS,
      status: "NEW",
    });
  });
});
