import "../config/dotenv.js";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@leadflow/db";
import { AppError } from "../lib/app-error.js";
import {
  addDiscussion,
  createLead,
  listDiscussions,
  updateLead,
} from "./leads.service.js";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

let tag = "";
const createdIds: string[] = [];

beforeEach(() => {
  tag = `__test__${Date.now()}${Math.floor(Math.random() * 1000)}`;
  createdIds.length = 0;
});

afterEach(async () => {
  if (createdIds.length > 0) {
    await prisma.lead.deleteMany({ where: { id: { in: createdIds } } });
  }
});

async function makeLead(nextFollowUpAt?: string | null): Promise<string> {
  const lead = await createLead({ name: `${tag} lead` });
  createdIds.push(lead.id);
  if (nextFollowUpAt !== undefined) {
    await updateLead(lead.id, { nextFollowUpAt });
  }
  return lead.id;
}

async function followUpOf(id: string): Promise<string | null> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  return lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null;
}

describe("addDiscussion follow-up rules (spec 4.2)", () => {
  it("sets nextFollowUpAt when followUpAt is provided", async () => {
    const id = await makeLead(null);
    const target = new Date(Date.now() + 48 * 3_600_000).toISOString();
    const { discussion, lead } = await addDiscussion(id, { note: "hello", followUpAt: target });
    assert.equal(discussion.note, "hello");
    assert.equal(lead.nextFollowUpAt, target);
    assert.equal(await followUpOf(id), target);
  });

  it("clears a due follow-up when no followUpAt is given", async () => {
    const past = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const id = await makeLead(past);
    const { lead } = await addDiscussion(id, { note: "acted on it" });
    assert.equal(lead.nextFollowUpAt, null);
    assert.equal(await followUpOf(id), null);
  });

  it("leaves a future follow-up unchanged when no followUpAt is given", async () => {
    const future = new Date(Date.now() + 72 * 3_600_000).toISOString();
    const id = await makeLead(future);
    const { lead } = await addDiscussion(id, { note: "just a note" });
    assert.equal(lead.nextFollowUpAt, future);
  });

  it("prepends newest-first and returns the lead with lastDiscussion", async () => {
    const id = await makeLead(null);
    await addDiscussion(id, { note: "first" });
    await addDiscussion(id, { note: "second" });
    const items = await listDiscussions(id);
    assert.deepEqual(
      items.map((d) => d.note),
      ["second", "first"],
    );
  });
});

describe("not found handling", () => {
  it("throws AppError 404 NOT_FOUND for unknown leads", async () => {
    for (const fn of [
      () => addDiscussion(UNKNOWN_ID, { note: "x" }),
      () => listDiscussions(UNKNOWN_ID),
      () => updateLead(UNKNOWN_ID, { status: "WON" }),
    ]) {
      await assert.rejects(fn, (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, "NOT_FOUND");
        return true;
      });
    }
  });

  it("PATCH can clear the follow-up with null", async () => {
    const future = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const id = await makeLead(future);
    const updated = await updateLead(id, { nextFollowUpAt: null });
    assert.equal(updated.nextFollowUpAt, null);
  });
});
