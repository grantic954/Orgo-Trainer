// Lazy-loaded RDKit.js singleton. Browser-only (WASM is served from /public).
//
// Usage:
//   const rdkit = await getRDKit();
//   const mol = rdkit.get_mol("c1ccccc1");
//   mol.get_svg();
//   mol.delete();   // Emscripten-managed; caller must free.

import type { MainModule, Mol } from "@rdkit/rdkit";

let rdkitPromise: Promise<MainModule> | null = null;

export async function getRDKit(): Promise<MainModule> {
  if (typeof window === "undefined") {
    throw new Error("RDKit is browser-only; guard with `typeof window !== 'undefined'`.");
  }
  if (!rdkitPromise) {
    rdkitPromise = (async () => {
      const { default: initRDKitModule } = await import("@rdkit/rdkit");
      return initRDKitModule({
        locateFile: (file: string) => `/${file}`,
      });
    })();
  }
  return rdkitPromise;
}

// Convenience: run a callback with a Mol and always clean up.
export async function withMol<T>(
  smiles: string,
  fn: (mol: Mol) => T,
): Promise<T | null> {
  const rdkit = await getRDKit();
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    return null;
  }
  try {
    return fn(mol);
  } finally {
    mol.delete();
  }
}

// Canonical SMILES from any input SMILES / molfile.
export async function canonicalSmiles(smiles: string): Promise<string | null> {
  return withMol(smiles, (mol) => mol.get_smiles());
}

// InChIKey (27 chars). First 14 chars = connectivity block (stereo-agnostic).
export async function inchiKey(smiles: string): Promise<string | null> {
  const rdkit = await getRDKit();
  return withMol(smiles, (mol) => rdkit.get_inchikey_for_inchi(mol.get_inchi()));
}
