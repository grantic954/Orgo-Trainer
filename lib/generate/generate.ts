// Reaction-template question generator. Takes a reaction template +
// substrates, runs RDKit's reaction SMARTS engine, and emits
// draw_product question objects that the schema validator can bless.
//
// RDKit is loaded dynamically (browser or node) via the Phase 1 loader.

import { getRDKit } from "@/lib/chem/rdkit";
import type { ReactionTemplate } from "./templates";
import type { Substrate } from "./substrates";

interface RDKitLikeReaction {
  get_rxn(input: string): unknown;
  get_mol(input: string): unknown;
}

export interface GeneratedQuestion {
  id: string;
  topic: string;
  type: "draw_product";
  difficulty: number;
  prompt: string;
  reactants: string[];
  reagents: string[];
  answers: Array<{ smiles: string; label: string }>;
  acceptable: [];
  traps: [];
  concepts: string[];
  explanation: string;
  source: "generated";
}

interface MolLike {
  is_valid(): boolean;
  get_smiles(): string;
  delete(): void;
}

interface RxnLike {
  is_valid(): boolean;
  run_reactants(reactants: unknown, maxProducts: number): string;
  delete(): void;
}

interface MolListLike {
  push_back(m: unknown): void;
  size(): number;
  get(i: number): unknown;
  delete(): void;
}

export async function generateFromTemplate(
  template: ReactionTemplate,
  reactants: Substrate[],
): Promise<GeneratedQuestion | null> {
  const rdkit = (await getRDKit()) as unknown as RDKitLikeReaction & {
    MolList: new () => MolListLike;
  };

  const rxn = rdkit.get_rxn(template.smarts) as RxnLike;
  if (!rxn || !rxn.is_valid()) {
    rxn?.delete();
    return null;
  }

  const mols: MolLike[] = [];
  const molList = new rdkit.MolList();
  try {
    for (const sub of reactants) {
      const m = rdkit.get_mol(sub.smiles) as MolLike;
      if (!m || !m.is_valid()) {
        m?.delete();
        return null;
      }
      mols.push(m);
      molList.push_back(m);
    }

    const resultJson = rxn.run_reactants(molList, 1);
    const result = JSON.parse(resultJson) as Array<Array<{ smiles?: string }>>;
    if (!result || result.length === 0 || !result[0] || result[0].length === 0) {
      return null;
    }

    const productSmiles = result[0]
      .map((p) => p.smiles)
      .filter((s): s is string => typeof s === "string");
    if (productSmiles.length === 0) return null;

    const prompt = fillPrompt(template.promptStem, reactants);

    return {
      id: `gen-${template.id}-${reactants.map((r) => shortName(r.name)).join("-")}`,
      topic: template.topic,
      type: "draw_product",
      difficulty: 2,
      prompt,
      reactants: reactants.map((r) => r.smiles),
      reagents: template.reagents,
      answers: productSmiles.map((s) => ({ smiles: s, label: template.name })),
      acceptable: [],
      traps: [],
      concepts: template.concepts,
      explanation: template.explanation,
      source: "generated",
    };
  } finally {
    for (const m of mols) m.delete();
    molList.delete();
    rxn.delete();
  }
}

function fillPrompt(stem: string, reactants: Substrate[]): string {
  return stem.replace(/\{R(\d+)\}/g, (_m, idx) => {
    const i = Number(idx) - 1;
    return reactants[i]?.name ?? `R${idx}`;
  });
}

function shortName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 20);
}
