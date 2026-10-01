// Ring-template Struct cache. Builds Ketcher Struct objects from SMILES
// by routing SMILES → RDKit → V2000 molblock → MolSerializer. Each struct
// is cached after first build so clicking a template is instantaneous
// after the initial warmup.
//
// ketcher-core is dynamically imported inside the function so Next.js's
// server-side build graph doesn't pull in its jsdom transitive dep.

import { getRDKit } from "@/lib/chem/rdkit";
import type { ToolId } from "./tools";

// Ketcher's Struct type is opaque to our code — the editor only needs to
// receive it back. We keep it `unknown` so we don't import ketcher-core at
// module scope (its jsdom transitive dep breaks the Turbopack build graph).
type Struct = unknown;

export const RING_SMILES: Partial<Record<ToolId, string>> = {
  "ring-benzene": "c1ccccc1",
  "ring-cyclohexane": "C1CCCCC1",
  "ring-cyclopentane": "C1CCCC1",
  "ring-cyclobutane": "C1CCC1",
  "ring-cyclopropane": "C1CC1",
  "ring-cycloheptane": "C1CCCCCC1",
};

const cache = new Map<string, Struct>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serializer: any = null;

export async function getRingStruct(id: ToolId): Promise<Struct | null> {
  const smiles = RING_SMILES[id];
  if (!smiles) return null;
  const cached = cache.get(smiles);
  if (cached) return cached;

  const rdkit = await getRDKit();
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    return null;
  }
  try {
    const molblock = mol.get_molblock();
    if (!serializer) {
      const { MolSerializer } = await import("ketcher-core");
      serializer = new MolSerializer();
    }
    const struct = serializer.deserialize(molblock);
    cache.set(smiles, struct);
    return struct;
  } finally {
    mol.delete();
  }
}
