// Validates every JSON file in data/questions/ per §2 rule 2:
//   1. Parses against the Zod schema (data/questions/*.json → Question).
//   2. Every SMILES parses in RDKit (answers, acceptable, traps, reactants).
//   3. Formula(answer) == formula(reactants) is NOT required (reagents may
//      change the formula) — but answer must differ from every reactant.
//   4. Every trap.trap id must exist in data/traps.json.
//
// Runs in node via the WASM binary from @rdkit/rdkit.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import initRDKitModule from "@rdkit/rdkit";
import { QuestionSchema, type Question } from "../lib/questions/schema";

const ROOT = process.cwd();
const QUESTIONS_DIR = join(ROOT, "data", "questions");
const TRAPS_PATH = join(ROOT, "data", "traps.json");
const WASM_PATH = join(ROOT, "node_modules", "@rdkit", "rdkit", "dist", "RDKit_minimal.wasm");

interface ValidationError {
  file: string;
  message: string;
}

function loadTrapIds(): Set<string> {
  const raw = JSON.parse(readFileSync(TRAPS_PATH, "utf-8")) as {
    traps: Array<{ id: string }>;
  };
  return new Set(raw.traps.map((t) => t.id));
}

function listQuestionFiles(): string[] {
  try {
    return readdirSync(QUESTIONS_DIR)
      .filter((f) => f.endsWith(".json") && statSync(join(QUESTIONS_DIR, f)).isFile())
      .sort();
  } catch {
    return [];
  }
}

interface RDKitMol {
  is_valid(): boolean;
  get_smiles(): string;
  get_inchi(): string;
  delete(): void;
}

interface RDKitModule {
  get_mol(input: string): RDKitMol | null;
  get_inchikey_for_inchi(inchi: string): string;
}

function canonicalize(rdkit: RDKitModule, smiles: string): string | null {
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    return null;
  }
  try {
    return rdkit.get_inchikey_for_inchi(mol.get_inchi());
  } finally {
    mol.delete();
  }
}

function validateSmilesFields(
  rdkit: RDKitModule,
  q: Question,
  file: string,
  trapIds: Set<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const push = (m: string) => errors.push({ file, message: m });

  // reactants
  const reactantKeys = new Set<string>();
  for (const s of q.reactants ?? []) {
    const key = canonicalize(rdkit, s);
    if (!key) push(`reactant SMILES failed to parse: '${s}'`);
    else reactantKeys.add(key);
  }

  if (
    q.type === "draw_product" ||
    q.type === "draw_starting_material" ||
    q.type === "stereo_draw" ||
    q.type === "spectrum_id" ||
    q.type === "multistep"
  ) {
    for (const [i, a] of q.answers.entries()) {
      const key = canonicalize(rdkit, a.smiles);
      if (!key) {
        push(`answers[${i}] SMILES failed to parse: '${a.smiles}'`);
        continue;
      }
      if (q.type === "draw_product" && reactantKeys.has(key)) {
        push(`answers[${i}] '${a.smiles}' is identical to a reactant — answer must differ.`);
      }
    }
    for (const [i, a] of q.acceptable.entries()) {
      if (!canonicalize(rdkit, a.smiles)) {
        push(`acceptable[${i}] SMILES failed to parse: '${a.smiles}'`);
      }
    }
    for (const [i, t] of q.traps.entries()) {
      if (!canonicalize(rdkit, t.smiles)) {
        push(`traps[${i}] SMILES failed to parse: '${t.smiles}'`);
      }
      if (!trapIds.has(t.trap)) {
        push(`traps[${i}].trap '${t.trap}' is not defined in data/traps.json`);
      }
    }
  }

  if (q.type === "mcq") {
    for (const [i, o] of q.options.entries()) {
      if (o.smiles && !canonicalize(rdkit, o.smiles)) {
        push(`options[${i}] SMILES failed to parse: '${o.smiles}'`);
      }
    }
    const ids = new Set(q.options.map((o) => o.id));
    if (!ids.has(q.correctOptionId)) {
      push(`correctOptionId '${q.correctOptionId}' is not one of the options`);
    }
  }

  if (q.type === "rank") {
    const ids = new Set(q.items.map((i) => i.id));
    for (const id of q.correctOrder) {
      if (!ids.has(id)) push(`correctOrder references unknown item id '${id}'`);
    }
    if (q.correctOrder.length !== q.items.length) {
      push(`correctOrder length (${q.correctOrder.length}) != items length (${q.items.length})`);
    }
  }

  if (q.type === "reagent_fill") {
    const ids = new Set(q.reagentChoices.map((r) => r.id));
    for (const id of q.correctReagentIds) {
      if (!ids.has(id)) push(`correctReagentIds references unknown reagent '${id}'`);
    }
  }

  return errors;
}

async function main() {
  const files = listQuestionFiles();
  if (files.length === 0) {
    console.log("[validate-questions] no questions yet — skipping.");
    return;
  }

  const trapIds = loadTrapIds();

  const wasmBinary = readFileSync(WASM_PATH);
  const rdkit = (await initRDKitModule({
    wasmBinary,
    // Silence emscripten's default logs.
    print: () => {},
    printErr: () => {},
  })) as unknown as RDKitModule;

  const seenIds = new Set<string>();
  const errors: ValidationError[] = [];

  for (const file of files) {
    const full = join(QUESTIONS_DIR, file);
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(full, "utf-8"));
    } catch (e) {
      errors.push({ file, message: `JSON parse error: ${(e as Error).message}` });
      continue;
    }
    const parsed = QuestionSchema.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
        .join("; ");
      errors.push({ file, message: `schema: ${issues}` });
      continue;
    }
    const q = parsed.data;
    if (seenIds.has(q.id)) {
      errors.push({ file, message: `duplicate question id '${q.id}'` });
    }
    seenIds.add(q.id);

    errors.push(...validateSmilesFields(rdkit, q, file, trapIds));
  }

  if (errors.length > 0) {
    console.error(`[validate-questions] ${errors.length} error(s) in ${files.length} file(s):`);
    for (const e of errors) console.error(`  ${e.file}: ${e.message}`);
    process.exit(1);
  }

  console.log(`[validate-questions] ${files.length} file(s) OK.`);
}

main().catch((e) => {
  console.error("[validate-questions] fatal:", e);
  process.exit(1);
});
