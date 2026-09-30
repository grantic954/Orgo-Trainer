// Phase 3 — walks data/questions/*.json and validates each with RDKit.
// Placeholder: exits 0 when there are no question files (scaffold state).

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const QUESTIONS_DIR = join(process.cwd(), "data", "questions");

function listQuestionFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter(
      (f) => f.endsWith(".json") && statSync(join(dir, f)).isFile(),
    );
  } catch {
    return [];
  }
}

const files = listQuestionFiles(QUESTIONS_DIR);

if (files.length === 0) {
  console.log("[validate-questions] no questions yet — skipping (scaffold).");
  process.exit(0);
}

console.error(
  "[validate-questions] Phase 3 validator not implemented yet; " +
    `${files.length} question file(s) found but cannot be validated.`,
);
process.exit(1);
