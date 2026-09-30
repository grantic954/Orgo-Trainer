import { describe, it, expect } from "vitest";
import {
  gradeCanonical,
  grade,
  type Canonical,
  type CanonicalOrError,
  type Canonicalizer,
  type QuestionForGrading,
} from "./grade";

// -- tiny in-memory Canonicalizer: keyed on input string ----------------

function canon(input: string, key: string, formula = "CxHy", opts?: { stereoSuffix?: string }): Canonical {
  // key is a synthetic 14-char connectivity block; if stereo suffix is provided,
  // the full inchi key differs on the tail but the block matches.
  const block = key.padEnd(14, "A").slice(0, 14);
  const stereo = (opts?.stereoSuffix ?? "SSSSSSSSSSSSS-N").padEnd(13, "S").slice(0, 13);
  return {
    input,
    formula,
    smiles: input,
    inchiKey: `${block}-${stereo}`,
    connectivityKey: block,
  };
}

function fixtureCanonicalizer(entries: Record<string, CanonicalOrError>): Canonicalizer {
  return {
    canonicalize(smiles: string) {
      const hit = entries[smiles];
      if (!hit) {
        return { input: smiles, error: "unknown SMILES in fixture" };
      }
      return hit;
    },
  };
}

// -- gradeCanonical: pure comparisons -----------------------------------

describe("gradeCanonical", () => {
  const answerA = canon("A", "KEYA", "C7H6O2");
  const answerB = canon("B", "KEYB", "C7H6O2");

  const question: QuestionForGrading = {
    id: "test-01",
    answers: [{ smiles: "A", label: "major" }],
  };

  it("returns correct on exact InChIKey match", () => {
    const r = gradeCanonical({
      user: answerA,
      question,
      answers: [answerA],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("correct");
    expect(r.credit).toBe(1);
    expect(r.matchedAnswer?.label).toBe("major");
  });

  it("returns partial-stereo when connectivity matches but stereo differs", () => {
    const userWrongStereo = canon("A", "KEYA", "C7H6O2", { stereoSuffix: "XXXXXXXXXXXXX-N" });
    const r = gradeCanonical({
      user: userWrongStereo,
      question,
      answers: [answerA],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("partial-stereo");
    expect(r.credit).toBe(0.5);
    expect(r.diagnostics).toContain("stereo-ignored");
  });

  it("upgrades a stereo-only match to correct when ignoreStereo is set", () => {
    const userWrongStereo = canon("A", "KEYA", "C7H6O2", { stereoSuffix: "XXXXXXXXXXXXX-N" });
    const r = gradeCanonical({
      user: userWrongStereo,
      question: { ...question, ignoreStereo: true },
      answers: [answerA],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("correct");
    expect(r.credit).toBe(1);
  });

  it("returns acceptable with partial credit when it matches an alternate", () => {
    const alt = canon("B", "KEYB", "C7H6O2");
    const r = gradeCanonical({
      user: alt,
      question: {
        ...question,
        acceptable: [{ smiles: "B", label: "ortho, minor", credit: 0.5 }],
      },
      answers: [answerA],
      acceptable: [{ answer: { smiles: "B", label: "ortho, minor", credit: 0.5 }, canon: alt }],
      reactants: [],
    });
    expect(r.verdict).toBe("acceptable");
    expect(r.credit).toBe(0.5);
    expect(r.matchedAnswer?.label).toBe("ortho, minor");
  });

  it("returns starting-material when the drawing is the reactant", () => {
    const reactant = canon("R", "KEYR", "C7H8O");
    const r = gradeCanonical({
      user: reactant,
      question: { ...question, reactants: ["R"] },
      answers: [answerA],
      acceptable: [],
      reactants: [reactant],
    });
    expect(r.verdict).toBe("starting-material");
    expect(r.credit).toBe(0);
    expect(r.diagnostics).toContain("no-reaction");
  });

  it("returns wrong with a formula-mismatch diagnostic", () => {
    const other = canon("Z", "KEYZ", "C8H8O2");
    const r = gradeCanonical({
      user: other,
      question,
      answers: [answerA],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("wrong");
    expect(r.credit).toBe(0);
    expect(r.diagnostics.some((d) => d.startsWith("formula-mismatch:"))).toBe(true);
  });

  it("returns wrong with same-formula-different-structure when formula matches", () => {
    const isomer = canon("Z", "KEYZ", "C7H6O2");
    const r = gradeCanonical({
      user: isomer,
      question,
      answers: [answerA],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("wrong");
    expect(r.diagnostics).toContain("same-formula-different-structure");
  });

  it("prefers the exact match over the connectivity-only match", () => {
    // both a and b have same connectivity block KEYA; only a matches exactly.
    const bSameConn = canon("B", "KEYA", "C7H6O2", { stereoSuffix: "XXXXXXXXXXXXX-N" });
    const r = gradeCanonical({
      user: answerA,
      question: { ...question, answers: [{ smiles: "A" }, { smiles: "B" }] },
      answers: [answerA, bSameConn],
      acceptable: [],
      reactants: [],
    });
    expect(r.verdict).toBe("correct");
    expect(r.matchedAnswer?.smiles).toBe("A");
  });
});

// -- grade: end-to-end via fixture Canonicalizer ------------------------

describe("grade (async pipeline)", () => {
  it("canonicalizes and returns invalid for a parse error", async () => {
    const canonicalizer = fixtureCanonicalizer({});
    const r = await grade("garbage", { id: "q", answers: [{ smiles: "A" }] }, canonicalizer);
    expect(r.verdict).toBe("invalid");
    expect(r.credit).toBe(0);
    expect(r.diagnostics[0]).toMatch(/^parse-error:/);
  });

  it("threads answers through the canonicalizer and grades correct", async () => {
    const A = canon("A", "KEYA", "C7H6O2");
    const canonicalizer = fixtureCanonicalizer({ A });
    const r = await grade("A", { id: "q", answers: [{ smiles: "A" }] }, canonicalizer);
    expect(r.verdict).toBe("correct");
  });

  it("throws when a question's answer SMILES itself fails to parse", async () => {
    // User input parses; the answer doesn't.
    const canonicalizer = fixtureCanonicalizer({ U: canon("U", "KEYU") });
    await expect(
      grade("U", { id: "bad-q", answers: [{ smiles: "BROKEN" }] }, canonicalizer),
    ).rejects.toThrow(/bad-q/);
  });

  it("uses friendlier messages for valence/aromatic/kekul errors", async () => {
    const canonicalizer: Canonicalizer = {
      canonicalize: (s) => ({ input: s, error: "Valence check failed" }),
    };
    const r = await grade("bad", { id: "q", answers: [{ smiles: "A" }] }, canonicalizer);
    expect(r.verdict).toBe("invalid");
    expect(r.message.toLowerCase()).toContain("valence");
  });
});
