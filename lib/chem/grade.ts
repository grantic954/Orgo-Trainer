// Phase 1 — deterministic grader (canonical SMILES / InChIKey compare + diagnostics).
export type GradeVerdict = "correct" | "partial-stereo" | "acceptable" | "wrong";

export interface GradeResult {
  verdict: GradeVerdict;
  credit: number;
  diagnostics: string[];
}

export function grade(_userSmiles: string, _questionId: string): GradeResult {
  throw new Error("grade() not yet implemented (Phase 1).");
}
