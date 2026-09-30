// RDKit-backed Canonicalizer implementation. Browser-only (uses WASM).
// The grader ships a mockable interface in `grade.ts`; this is the real thing.

import { getRDKit } from "./rdkit";
import type { CanonicalOrError, Canonicalizer } from "./grade";

export function rdkitCanonicalizer(): Canonicalizer {
  return {
    async canonicalize(input: string): Promise<CanonicalOrError> {
      const rdkit = await getRDKit();
      const mol = rdkit.get_mol(input);
      if (!mol || !mol.is_valid()) {
        mol?.delete();
        return { input, error: "invalid structure" };
      }
      try {
        const smiles = mol.get_smiles();
        const inchi = mol.get_inchi();
        const inchiKey = rdkit.get_inchikey_for_inchi(inchi);
        const descriptors = safeDescriptors(mol);
        return {
          input,
          smiles,
          formula: descriptors.formula,
          inchiKey,
          connectivityKey: inchiKey.slice(0, 14),
        };
      } finally {
        mol.delete();
      }
    },
  };
}

interface MolWithDescriptors {
  get_descriptors(): string;
}

function safeDescriptors(mol: unknown): { formula: string } {
  const m = mol as MolWithDescriptors;
  try {
    const raw = m.get_descriptors();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.formula === "string") return { formula: parsed.formula };
  } catch {
    // fall through
  }
  return { formula: "" };
}
