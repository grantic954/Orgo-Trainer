import { describe, it, expect } from "vitest";
import { arrowsEqual, gradeArrows, type Arrow } from "./schema";

describe("arrowsEqual", () => {
  it("single-atom source: matches regardless of order of sourceAtom", () => {
    const a: Arrow = { sourceAtom: 2, sinkAtom: 5 };
    const b: Arrow = { sourceAtom: 2, sinkAtom: 5 };
    expect(arrowsEqual(a, b)).toBe(true);
  });
  it("bond source: order-independent on the two atoms", () => {
    const a: Arrow = { sourceAtom: 1, sourceAtom2: 2, sinkAtom: 3 };
    const b: Arrow = { sourceAtom: 2, sourceAtom2: 1, sinkAtom: 3 };
    expect(arrowsEqual(a, b)).toBe(true);
  });
  it("different sinks never match", () => {
    expect(
      arrowsEqual({ sourceAtom: 1, sinkAtom: 2 }, { sourceAtom: 1, sinkAtom: 3 }),
    ).toBe(false);
  });
});

describe("gradeArrows", () => {
  const expected: Arrow[] = [
    { sourceAtom: 0, sinkAtom: 1 },
    { sourceAtom: 1, sourceAtom2: 2, sinkAtom: 2 },
  ];
  it("exact match (order-independent) is correct", () => {
    const result = gradeArrows(expected, [
      { sourceAtom: 1, sourceAtom2: 2, sinkAtom: 2 },
      { sourceAtom: 0, sinkAtom: 1 },
    ]);
    expect(result.correct).toBe(true);
    expect(result.matched).toBe(2);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });
  it("missing arrow reported", () => {
    const result = gradeArrows(expected, [{ sourceAtom: 0, sinkAtom: 1 }]);
    expect(result.correct).toBe(false);
    expect(result.matched).toBe(1);
    expect(result.missing).toHaveLength(1);
  });
  it("extra arrow reported", () => {
    const result = gradeArrows(expected, [
      ...expected,
      { sourceAtom: 7, sinkAtom: 8 },
    ]);
    expect(result.correct).toBe(false);
    expect(result.extra).toHaveLength(1);
  });
});
