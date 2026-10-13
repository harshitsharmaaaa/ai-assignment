/**
 * Pure follow-up date helpers (UI-only, local timezone).
 * All functions take an injectable `now` so they are unit-testable.
 */

export type FollowUpPresetId = "tomorrow" | "in3days" | "nextMonday";

export type SnoozeId = "plus1h" | "tomorrow9am" | "nextWeek" | "clear";

function at9am(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(9, 0, 0, 0);
  return copy;
}

/** Tomorrow at 9:00 local. */
export function tomorrow9am(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return at9am(d);
}

/** In 3 days at 9:00 local. */
export function in3Days9am(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 3);
  return at9am(d);
}

/** Next Monday at 9:00 local (if today is Monday, the Monday 7 days out). */
export function nextMonday9am(now: Date = new Date()): Date {
  const d = new Date(now);
  const delta = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + delta);
  return at9am(d);
}

/** One hour from now (snooze). */
export function plus1Hour(now: Date = new Date()): Date {
  return new Date(now.getTime() + 3_600_000);
}

/** Same time next week (snooze). */
export function nextWeekSameTime(now: Date = new Date()): Date {
  return new Date(now.getTime() + 7 * 24 * 3_600_000);
}

export const FOLLOW_UP_PRESETS: {
  id: FollowUpPresetId;
  label: string;
  compute: (now: Date) => Date;
}[] = [
  { id: "tomorrow", label: "Tomorrow 9am", compute: (now) => tomorrow9am(now) },
  { id: "in3days", label: "In 3 days", compute: (now) => in3Days9am(now) },
  { id: "nextMonday", label: "Next Monday", compute: (now) => nextMonday9am(now) },
];

export const SNOOZE_ACTIONS: {
  id: SnoozeId;
  label: string;
  compute: (now: Date) => Date | null;
}[] = [
  { id: "plus1h", label: "+1h", compute: (now) => plus1Hour(now) },
  { id: "tomorrow9am", label: "Tomorrow 9am", compute: (now) => tomorrow9am(now) },
  { id: "nextWeek", label: "Next week", compute: (now) => nextWeekSameTime(now) },
  { id: "clear", label: "Clear", compute: () => null },
];

/** Format a Date to a `datetime-local` input value (local timezone). */
export function toLocalInputValue(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

/** Parse a `datetime-local` value to ISO, or null when empty/invalid. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
