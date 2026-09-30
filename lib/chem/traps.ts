// Trap detector — §6 of CLAUDE.md.
//
// Runs after the deterministic grader has said "wrong" (or "partial-stereo")
// and tags *why* the user's structure differs from the expected answer, so
// the AI tutor can give specific feedback without having to guess.
//
// Design note: this module is pure — it operates on pre-extracted
// `StructureFeatures` (formula, canonical/connectivity keys, functional-group
// tags, charge state). A separate browser-side extractor populates those
// features via RDKit SMARTS. That extractor lives outside this file so the
// rules stay unit-testable without WASM.

export interface StructureFeatures {
  formula: string;
  inchiKey: string;
  connectivityKey: string; // first 14 chars of InChIKey
  functionalGroups: string[]; // ids: 'alcohol','aldehyde','ketone','ester','amine',...
  hasCharge: boolean;
  hasAlkoxide?: boolean;
  hasCarbanion?: boolean;
  // For heuristic checks:
  carbonSkeletonHash?: string; // Morgan fingerprint hash w/o functional groups
}

export interface TrapQuestionContext {
  id: string;
  reagents: string[]; // reagent ids from data/reagents.json
  expectsRearrangement?: boolean;
  enolateKind?: "kinetic" | "thermodynamic";
  // Reactant-level flags the question can set explicitly:
  reactantHasAcidicProton?: boolean;
  reactantIsStronglyDeactivated?: boolean;
}

export interface PerQuestionTrapEntry {
  connectivityKey: string; // canonicalized trap SMILES → key
  trap: string; // trap id
  note?: string;
}

export interface TrapContext {
  question: TrapQuestionContext;
  user: StructureFeatures;
  answer: StructureFeatures;
  reactants: StructureFeatures[];
  perQuestion: PerQuestionTrapEntry[];
}

export interface TrapHit {
  id: string;
  source: "per-question" | "generic";
  note?: string;
}

// ---------------------------------------------------------------------------
// Generic rules
// ---------------------------------------------------------------------------

export const stereoIgnoredRule = (ctx: TrapContext): TrapHit | null =>
  ctx.user.connectivityKey === ctx.answer.connectivityKey &&
  ctx.user.inchiKey !== ctx.answer.inchiKey
    ? { id: "stereo-ignored", source: "generic" }
    : null;

export const regioWrongRule = (ctx: TrapContext): TrapHit | null => {
  const sameFormula = ctx.user.formula === ctx.answer.formula;
  const sameConnectivity = ctx.user.connectivityKey === ctx.answer.connectivityKey;
  const sameGroups = sameSet(ctx.user.functionalGroups, ctx.answer.functionalGroups);
  return sameFormula && !sameConnectivity && sameGroups
    ? { id: "regio-wrong", source: "generic" }
    : null;
};

export const rearrangementIgnoredRule = (ctx: TrapContext): TrapHit | null => {
  if (!ctx.question.expectsRearrangement) return null;
  // User's carbon skeleton matches a reactant's skeleton but the answer's does not.
  if (!ctx.user.carbonSkeletonHash || !ctx.answer.carbonSkeletonHash) return null;
  const matchesAReactant = ctx.reactants.some(
    (r) => r.carbonSkeletonHash && r.carbonSkeletonHash === ctx.user.carbonSkeletonHash,
  );
  const differsFromAnswer = ctx.user.carbonSkeletonHash !== ctx.answer.carbonSkeletonHash;
  return matchesAReactant && differsFromAnswer
    ? { id: "rearrangement-ignored", source: "generic" }
    : null;
};

export const workupMissingRule = (ctx: TrapContext): TrapHit | null => {
  const chargedUser = ctx.user.hasCharge || ctx.user.hasAlkoxide || ctx.user.hasCarbanion;
  const neutralAnswer = !ctx.answer.hasCharge && !ctx.answer.hasAlkoxide && !ctx.answer.hasCarbanion;
  return chargedUser && neutralAnswer
    ? { id: "workup-missing", source: "generic" }
    : null;
};

export const fcDeactivatedRule = (ctx: TrapContext): TrapHit | null => {
  const usingFC = ctx.question.reagents.some((r) => r === "AlCl3" || r === "FeBr3" || /friedel/i.test(r));
  return usingFC && ctx.question.reactantIsStronglyDeactivated
    ? { id: "fc-deactivated", source: "generic" }
    : null;
};

export const acidicProtonGrignardRule = (ctx: TrapContext): TrapHit | null => {
  const usingGrignard = ctx.question.reagents.some((r) => /grignard|MgBr|MgCl|MgI/i.test(r));
  return usingGrignard && ctx.question.reactantHasAcidicProton
    ? { id: "acidic-proton-grignard", source: "generic" }
    : null;
};

export const overReactionRule = (ctx: TrapContext): TrapHit | null => {
  // DIBAL should stop at the aldehyde; if the user shows a 1° alcohol, they over-reduced.
  const dibal = ctx.question.reagents.some((r) => /dibal/i.test(r));
  if (!dibal) return null;
  const userHasAlcohol = ctx.user.functionalGroups.includes("alcohol");
  const answerHasAldehyde = ctx.answer.functionalGroups.includes("aldehyde");
  return userHasAlcohol && answerHasAldehyde
    ? { id: "over-reaction", source: "generic" }
    : null;
};

export const underReactionRule = (ctx: TrapContext): TrapHit | null => {
  // Grignard + ester should add twice (tertiary alcohol). If the user shows a ketone,
  // they stopped after one addition.
  const grignard = ctx.question.reagents.some((r) => /grignard|MgBr|MgCl|MgI/i.test(r));
  const reactantIsEster = ctx.reactants.some((r) => r.functionalGroups.includes("ester"));
  if (!grignard || !reactantIsEster) return null;
  const userHasKetone = ctx.user.functionalGroups.includes("ketone");
  const answerHasAlcohol = ctx.answer.functionalGroups.includes("alcohol");
  return userHasKetone && answerHasAlcohol
    ? { id: "under-reaction", source: "generic" }
    : null;
};

export const wrongEnolateRule = (ctx: TrapContext): TrapHit | null => {
  // Requires the question to declare which enolate is expected. If declared and
  // the user's structure matches an alternate flagged as the other enolate via
  // per-question traps, tag it — but the generic rule can only note the kind
  // exists; the actual match is per-question data.
  if (!ctx.question.enolateKind) return null;
  const perQ = ctx.perQuestion.find((p) => p.connectivityKey === ctx.user.connectivityKey);
  if (perQ && (perQ.trap === "wrong-enolate" || perQ.note?.includes("enolate"))) {
    return { id: "wrong-enolate", source: "generic", note: perQ.note };
  }
  return null;
};

export const GENERIC_RULES: readonly ((ctx: TrapContext) => TrapHit | null)[] = [
  stereoIgnoredRule,
  regioWrongRule,
  rearrangementIgnoredRule,
  workupMissingRule,
  fcDeactivatedRule,
  acidicProtonGrignardRule,
  overReactionRule,
  underReactionRule,
  wrongEnolateRule,
];

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function detectTraps(ctx: TrapContext): TrapHit[] {
  const hits: TrapHit[] = [];

  // Per-question traps first — highest priority because they're authored.
  const perQ = ctx.perQuestion.find((p) => p.connectivityKey === ctx.user.connectivityKey);
  if (perQ) {
    hits.push({ id: perQ.trap, source: "per-question", note: perQ.note });
  }

  // Then generic rules — each may fire independently.
  for (const rule of GENERIC_RULES) {
    const hit = rule(ctx);
    if (hit && !hits.some((h) => h.id === hit.id)) hits.push(hit);
  }

  return hits;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const x of b) if (!set.has(x)) return false;
  return true;
}
