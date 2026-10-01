import { describe, it, expect } from "vitest";
import {
  emptyRecord,
  scheduleNext,
  verdictToRating,
  isDue,
  Rating,
  State,
} from "./fsrs";

describe("verdictToRating", () => {
  it("full-credit correct → Good", () => {
    expect(verdictToRating("correct", 1)).toBe(Rating.Good);
  });
  it("partial-credit correct → Hard", () => {
    expect(verdictToRating("correct", 0.5)).toBe(Rating.Hard);
  });
  it("acceptable → Hard", () => {
    expect(verdictToRating("acceptable", 0.5)).toBe(Rating.Hard);
  });
  it("partial-stereo → Hard", () => {
    expect(verdictToRating("partial-stereo", 0.5)).toBe(Rating.Hard);
  });
  it("wrong / starting-material / invalid → Again", () => {
    expect(verdictToRating("wrong", 0)).toBe(Rating.Again);
    expect(verdictToRating("starting-material", 0)).toBe(Rating.Again);
    expect(verdictToRating("invalid", 0)).toBe(Rating.Again);
  });
});

describe("scheduleNext", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("new card + Good advances state and sets due later", () => {
    const empty = emptyRecord("q1", now);
    expect(empty.state).toBe(State.New);
    const next = scheduleNext(empty, "correct", 1, now);
    expect(next.state).not.toBe(State.New);
    expect(next.due.getTime()).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
  });

  it("new card + Again stays near-term and increments lapses", () => {
    const empty = emptyRecord("q1", now);
    const next = scheduleNext(empty, "wrong", 0, now);
    expect(next.reps).toBe(1);
    expect(next.due.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(next.due.getTime() - now.getTime()).toBeLessThan(
      1000 * 60 * 60 * 24 * 2,
    );
  });

  it("isDue is true when due <= now", () => {
    const rec = emptyRecord("q1", now);
    expect(isDue(rec, now)).toBe(true);
    const scheduled = scheduleNext(rec, "correct", 1, now);
    expect(isDue(scheduled, now)).toBe(false);
    const later = new Date(scheduled.due.getTime() + 1000);
    expect(isDue(scheduled, later)).toBe(true);
  });

  it("correct ratings grow the interval across reviews", () => {
    let rec = emptyRecord("q1", now);
    const t1 = now;
    rec = scheduleNext(rec, "correct", 1, t1);
    const firstInterval = rec.due.getTime() - t1.getTime();

    const t2 = rec.due;
    rec = scheduleNext(rec, "correct", 1, t2);
    const secondInterval = rec.due.getTime() - t2.getTime();

    expect(secondInterval).toBeGreaterThan(firstInterval);
  });
});
