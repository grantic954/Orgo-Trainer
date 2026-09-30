import { describe, it, expect } from "vitest";
import {
  detectTraps,
  stereoIgnoredRule,
  regioWrongRule,
  rearrangementIgnoredRule,
  workupMissingRule,
  fcDeactivatedRule,
  acidicProtonGrignardRule,
  overReactionRule,
  underReactionRule,
  wrongEnolateRule,
  type StructureFeatures,
  type TrapContext,
  type TrapQuestionContext,
} from "./traps";

function feat(overrides: Partial<StructureFeatures> = {}): StructureFeatures {
  return {
    formula: "C6H6",
    inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBBBBB-N",
    connectivityKey: "AAAAAAAAAAAAAA",
    functionalGroups: [],
    hasCharge: false,
    ...overrides,
  };
}

function ctx(o: Partial<TrapContext>): TrapContext {
  return {
    question: { id: "test", reagents: [], ...(o.question as TrapQuestionContext | undefined) },
    user: o.user ?? feat(),
    answer: o.answer ?? feat(),
    reactants: o.reactants ?? [],
    perQuestion: o.perQuestion ?? [],
  };
}

describe("stereoIgnoredRule", () => {
  it("fires when connectivity matches but full key differs", () => {
    const hit = stereoIgnoredRule(
      ctx({
        user: feat({ inchiKey: "AAAAAAAAAAAAAA-XXXXXXXXXXXXX-N" }),
        answer: feat({ inchiKey: "AAAAAAAAAAAAAA-YYYYYYYYYYYYY-N" }),
      }),
    );
    expect(hit?.id).toBe("stereo-ignored");
  });
  it("does not fire when full InChIKey matches", () => {
    expect(stereoIgnoredRule(ctx({}))).toBeNull();
  });
});

describe("regioWrongRule", () => {
  it("fires when formula and groups match but connectivity differs", () => {
    const hit = regioWrongRule(
      ctx({
        user: feat({ formula: "C7H7Br", connectivityKey: "USR", functionalGroups: ["aryl-halide"] }),
        answer: feat({ formula: "C7H7Br", connectivityKey: "ANS", functionalGroups: ["aryl-halide"] }),
      }),
    );
    expect(hit?.id).toBe("regio-wrong");
  });
  it("does not fire when formulas differ", () => {
    expect(
      regioWrongRule(
        ctx({
          user: feat({ formula: "C7H7Br" }),
          answer: feat({ formula: "C8H7Br" }),
        }),
      ),
    ).toBeNull();
  });
});

describe("rearrangementIgnoredRule", () => {
  it("fires when user's skeleton matches a reactant but not the answer", () => {
    const hit = rearrangementIgnoredRule(
      ctx({
        question: { id: "q", reagents: [], expectsRearrangement: true },
        user: feat({ carbonSkeletonHash: "SK-A" }),
        answer: feat({ carbonSkeletonHash: "SK-B" }),
        reactants: [feat({ carbonSkeletonHash: "SK-A" })],
      }),
    );
    expect(hit?.id).toBe("rearrangement-ignored");
  });
  it("silent when expectsRearrangement is false", () => {
    expect(
      rearrangementIgnoredRule(
        ctx({
          user: feat({ carbonSkeletonHash: "SK-A" }),
          answer: feat({ carbonSkeletonHash: "SK-B" }),
          reactants: [feat({ carbonSkeletonHash: "SK-A" })],
        }),
      ),
    ).toBeNull();
  });
});

describe("workupMissingRule", () => {
  it("fires when user has a charge but the expected answer is neutral", () => {
    const hit = workupMissingRule(
      ctx({
        user: feat({ hasAlkoxide: true, hasCharge: true }),
        answer: feat({}),
      }),
    );
    expect(hit?.id).toBe("workup-missing");
  });
});

describe("fcDeactivatedRule", () => {
  it("fires when using an FC reagent on a strongly deactivated ring", () => {
    const hit = fcDeactivatedRule(
      ctx({
        question: {
          id: "q",
          reagents: ["AlCl3"],
          reactantIsStronglyDeactivated: true,
        },
      }),
    );
    expect(hit?.id).toBe("fc-deactivated");
  });
  it("silent without the deactivated flag", () => {
    expect(fcDeactivatedRule(ctx({ question: { id: "q", reagents: ["AlCl3"] } }))).toBeNull();
  });
});

describe("acidicProtonGrignardRule", () => {
  it("fires when Grignard used on an OH/NH/COOH-bearing substrate", () => {
    const hit = acidicProtonGrignardRule(
      ctx({
        question: {
          id: "q",
          reagents: ["CH3MgBr"],
          reactantHasAcidicProton: true,
        },
      }),
    );
    expect(hit?.id).toBe("acidic-proton-grignard");
  });
});

describe("overReactionRule", () => {
  it("fires when DIBAL was used but user reduced past the aldehyde to an alcohol", () => {
    const hit = overReactionRule(
      ctx({
        question: { id: "q", reagents: ["DIBAL-H", "-78C"] },
        user: feat({ functionalGroups: ["alcohol"] }),
        answer: feat({ functionalGroups: ["aldehyde"] }),
      }),
    );
    expect(hit?.id).toBe("over-reaction");
  });
});

describe("underReactionRule", () => {
  it("fires when Grignard+ester was expected to double-add but user shows a ketone", () => {
    const hit = underReactionRule(
      ctx({
        question: { id: "q", reagents: ["CH3MgBr"] },
        user: feat({ functionalGroups: ["ketone"] }),
        answer: feat({ functionalGroups: ["alcohol"] }),
        reactants: [feat({ functionalGroups: ["ester"] })],
      }),
    );
    expect(hit?.id).toBe("under-reaction");
  });
});

describe("wrongEnolateRule", () => {
  it("fires when the question is enolate-typed and the per-question trap says wrong-enolate", () => {
    const hit = wrongEnolateRule(
      ctx({
        question: { id: "q", reagents: ["LDA"], enolateKind: "kinetic" },
        user: feat({ connectivityKey: "USR" }),
        answer: feat({ connectivityKey: "ANS" }),
        perQuestion: [{ connectivityKey: "USR", trap: "wrong-enolate", note: "thermodynamic enolate" }],
      }),
    );
    expect(hit?.id).toBe("wrong-enolate");
  });
});

describe("detectTraps orchestration", () => {
  it("prefers per-question trap and still runs generic rules", () => {
    const hits = detectTraps(
      ctx({
        user: feat({
          connectivityKey: "USR",
          inchiKey: "USRUSRUSRUSR-A-N",
          formula: "C7H7Br",
          functionalGroups: ["aryl-halide"],
        }),
        answer: feat({
          connectivityKey: "USR",
          inchiKey: "USRUSRUSRUSR-B-N",
          formula: "C7H7Br",
          functionalGroups: ["aryl-halide"],
        }),
        perQuestion: [{ connectivityKey: "USR", trap: "wrong-director", note: "OMe is o/p" }],
      }),
    );
    const ids = hits.map((h) => h.id);
    expect(ids).toContain("wrong-director");
    expect(ids).toContain("stereo-ignored");
  });

  it("dedupes when a rule and a per-question trap have the same id", () => {
    const hits = detectTraps(
      ctx({
        user: feat({ connectivityKey: "USR", inchiKey: "AAAAAAAAAAAAAA-XX-N" }),
        answer: feat({ connectivityKey: "AAAAAAAAAAAAAA", inchiKey: "AAAAAAAAAAAAAA-YY-N" }),
        perQuestion: [{ connectivityKey: "USR", trap: "stereo-ignored" }],
      }),
    );
    expect(hits.filter((h) => h.id === "stereo-ignored")).toHaveLength(1);
  });
});
