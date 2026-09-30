// Deterministic grader per §6 of CLAUDE.md.
//
// The grading pipeline is split into two layers so it is testable without
// WebAssembly:
//
//   1. Canonicalization  — a `Canonicalizer` turns an input SMILES into a
//      `Canonical` record (formula, canonical SMILES, full InChIKey,
//      connectivity block). The real implementation uses RDKit; tests use a
//      fixture-backed one.
//   2. Comparison        — `gradeCanonical` compares the user's `Canonical`
//      against the question's answer/acceptable lists using pure logic and
//      returns a `GradeResult`.

export interface QuestionAnswer {
  smiles: string;
  label?: string;
  credit?: number; // 0..1; defaults to 1 for `answers`, from field for `acceptable`
}

export interface QuestionForGrading {
  id: string;
  answers: QuestionAnswer[];
  acceptable?: QuestionAnswer[];
  reactants?: string[]; // used to detect "answer == starting material"
  ignoreStereo?: boolean; // if true, connectivity-only match is a full correct
}

export interface Canonical {
  input: string;
  formula: string;
  smiles: string; // canonical SMILES
  inchiKey: string; // full 27-char key
  connectivityKey: string; // first 14 chars (block 1)
}

export interface CanonicalError {
  input: string;
  error: string;
}

export type CanonicalOrError = Canonical | CanonicalError;

export interface Canonicalizer {
  canonicalize(smiles: string): CanonicalOrError | Promise<CanonicalOrError>;
}

export function isCanonical(x: CanonicalOrError): x is Canonical {
  return "inchiKey" in x;
}

export type Verdict =
  | "correct"
  | "partial-stereo"
  | "acceptable"
  | "starting-material"
  | "wrong"
  | "invalid";

export interface GradeResult {
  verdict: Verdict;
  credit: number;
  message: string;
  diagnostics: string[];
  matchedAnswer?: QuestionAnswer;
}

// ---- pure comparison layer ----------------------------------------------

export interface GradeCanonicalInput {
  user: Canonical;
  question: QuestionForGrading;
  answers: Canonical[]; // canonicalized `question.answers`, same order
  acceptable: Array<{ answer: QuestionAnswer; canon: Canonical }>;
  reactants: Canonical[];
}

export function gradeCanonical(input: GradeCanonicalInput): GradeResult {
  const { user, question, answers, acceptable, reactants } = input;
  const diagnostics: string[] = [];

  // 1) exact InChIKey match against `answers` -> correct
  for (let i = 0; i < answers.length; i++) {
    if (answers[i].inchiKey === user.inchiKey) {
      return {
        verdict: "correct",
        credit: question.answers[i].credit ?? 1,
        message: "Correct.",
        diagnostics,
        matchedAnswer: question.answers[i],
      };
    }
  }

  // 2) connectivity-only match against `answers`
  for (let i = 0; i < answers.length; i++) {
    if (answers[i].connectivityKey === user.connectivityKey) {
      if (question.ignoreStereo) {
        return {
          verdict: "correct",
          credit: question.answers[i].credit ?? 1,
          message: "Correct.",
          diagnostics,
          matchedAnswer: question.answers[i],
        };
      }
      return {
        verdict: "partial-stereo",
        credit: 0.5,
        message: "Right skeleton — check the stereochemistry.",
        diagnostics: [...diagnostics, "stereo-ignored"],
        matchedAnswer: question.answers[i],
      };
    }
  }

  // 3) match against `acceptable` list (minor products / alternates)
  for (const item of acceptable) {
    if (item.canon.inchiKey === user.inchiKey) {
      return {
        verdict: "acceptable",
        credit: item.answer.credit ?? 0.5,
        message: item.answer.label
          ? `Accepted: ${item.answer.label}.`
          : "Accepted (alternate answer).",
        diagnostics,
        matchedAnswer: item.answer,
      };
    }
    if (item.canon.connectivityKey === user.connectivityKey) {
      return {
        verdict: "partial-stereo",
        credit: (item.answer.credit ?? 0.5) * 0.5,
        message: "Alternate skeleton — check the stereochemistry.",
        diagnostics: [...diagnostics, "stereo-ignored"],
        matchedAnswer: item.answer,
      };
    }
  }

  // 4) answer == starting material
  for (const r of reactants) {
    if (r.inchiKey === user.inchiKey) {
      return {
        verdict: "starting-material",
        credit: 0,
        message: "That's the starting material — the reaction didn't happen.",
        diagnostics: [...diagnostics, "no-reaction"],
      };
    }
  }

  // 5) diagnostics for the tutor
  const primary = answers[0];
  if (primary) {
    if (primary.formula !== user.formula) {
      diagnostics.push(`formula-mismatch:${primary.formula}!=${user.formula}`);
    } else {
      diagnostics.push("same-formula-different-structure");
    }
  }

  return {
    verdict: "wrong",
    credit: 0,
    message: "Not quite — try again or ask for a hint.",
    diagnostics,
  };
}

// ---- async wrapper that canonicalizes on the way in ---------------------

export async function grade(
  userSmiles: string,
  question: QuestionForGrading,
  canonicalizer: Canonicalizer,
): Promise<GradeResult> {
  const userCanon = await canonicalizer.canonicalize(userSmiles);
  if (!isCanonical(userCanon)) {
    return {
      verdict: "invalid",
      credit: 0,
      message: friendlyParseError(userCanon.error),
      diagnostics: [`parse-error:${userCanon.error}`],
    };
  }

  const answers = await canonicalizeAll(question.answers.map((a) => a.smiles), canonicalizer);
  const acceptableInputs = question.acceptable ?? [];
  const acceptableCanons = await canonicalizeAll(
    acceptableInputs.map((a) => a.smiles),
    canonicalizer,
  );
  const reactantsCanon = await canonicalizeAll(question.reactants ?? [], canonicalizer);

  const validAnswers: Canonical[] = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!isCanonical(a)) {
      throw new Error(
        `Question ${question.id} answer[${i}] '${question.answers[i].smiles}' failed to parse: ${a.error}`,
      );
    }
    validAnswers.push(a);
  }

  const acceptable: Array<{ answer: QuestionAnswer; canon: Canonical }> = [];
  for (let i = 0; i < acceptableCanons.length; i++) {
    const c = acceptableCanons[i];
    if (isCanonical(c)) {
      acceptable.push({ answer: acceptableInputs[i], canon: c });
    }
  }

  const reactants: Canonical[] = reactantsCanon.filter(isCanonical);

  return gradeCanonical({
    user: userCanon,
    question,
    answers: validAnswers,
    acceptable,
    reactants,
  });
}

async function canonicalizeAll(
  inputs: string[],
  canon: Canonicalizer,
): Promise<CanonicalOrError[]> {
  return Promise.all(inputs.map((s) => Promise.resolve(canon.canonicalize(s))));
}

function friendlyParseError(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes("valence")) return "Valence error — check the number of bonds on each atom.";
  if (lower.includes("aromatic")) return "Aromaticity error — check the ring.";
  if (lower.includes("kekul")) return "Kekulization failed — check aromatic bonds.";
  return "Couldn't parse the structure. Check for stray atoms or unclosed rings.";
}
