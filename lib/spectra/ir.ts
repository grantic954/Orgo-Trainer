// IR spectrum from structure via a curated SMARTS → band table.
// Predicts textbook-style peaks; not a real quantum-chemistry model.

import { getRDKitEither, type Mol } from "./rdkit-env";

export interface IrBand {
  peak: number;      // cm^-1
  intensity: number; // 0..100 (peak absorbance %)
  width: number;     // FWHM in cm^-1
  group: string;     // functional-group id
  label: string;     // human-readable
  atomIndices: number[]; // matched atoms in the substructure
}

export interface IrSpectrum {
  bands: IrBand[];
  xs: number[]; // 4000 → 400 (reversed by convention when plotted)
  ys: number[]; // % transmittance (0..100)
}

interface BandDef {
  smarts: string;
  peak: number;
  intensity: number;
  width: number;
  group: string;
  label: string;
}

// Curated table — expand as needed. Positions are typical textbook values.
export const IR_TABLE: readonly BandDef[] = [
  // O-H
  { smarts: "[OX2H][CX4]", peak: 3350, intensity: 70, width: 200, group: "alcohol-OH", label: "O–H (alcohol)" },
  { smarts: "[OX2H]c", peak: 3450, intensity: 60, width: 180, group: "phenol-OH", label: "O–H (phenol)" },
  { smarts: "[CX3](=O)[OX2H]", peak: 2900, intensity: 80, width: 600, group: "carboxylic-OH", label: "O–H (COOH, broad)" },
  // N-H
  { smarts: "[NX3;H2][CX4]", peak: 3400, intensity: 40, width: 120, group: "amine-NH2", label: "N–H (1° amine)" },
  { smarts: "[NX3;H1]([CX4])[CX4]", peak: 3350, intensity: 35, width: 100, group: "amine-NH", label: "N–H (2° amine)" },
  // sp3/sp2 C-H
  { smarts: "[CX4;H1,H2,H3]", peak: 2925, intensity: 40, width: 60, group: "sp3-CH", label: "C–H (sp³, <3000)" },
  { smarts: "[cX3;H1]", peak: 3050, intensity: 30, width: 40, group: "aromatic-CH", label: "=C–H (aromatic)" },
  { smarts: "[CX3;H1]=[CX3]", peak: 3080, intensity: 25, width: 50, group: "alkenyl-CH", label: "=C–H (alkene)" },
  // C≡X
  { smarts: "[CX2]#[NX1]", peak: 2250, intensity: 40, width: 30, group: "nitrile", label: "C≡N" },
  { smarts: "[CX2]#[CX2]", peak: 2150, intensity: 15, width: 30, group: "alkyne", label: "C≡C" },
  // C=O
  { smarts: "[CX3H1](=O)[#6]", peak: 1725, intensity: 90, width: 40, group: "aldehyde-CO", label: "C=O (aldehyde)" },
  { smarts: "[#6][CX3](=O)[#6]", peak: 1715, intensity: 90, width: 40, group: "ketone-CO", label: "C=O (ketone)" },
  { smarts: "[CX3](=O)[OX2H1]", peak: 1710, intensity: 90, width: 40, group: "cooh-CO", label: "C=O (COOH)" },
  { smarts: "[CX3](=O)[OX2][#6]", peak: 1735, intensity: 90, width: 40, group: "ester-CO", label: "C=O (ester)" },
  { smarts: "[NX3][CX3](=[OX1])[#6]", peak: 1660, intensity: 80, width: 50, group: "amide-CO", label: "C=O (amide)" },
  // Aromatic C=C
  { smarts: "c1ccccc1", peak: 1600, intensity: 40, width: 40, group: "aromatic-CC", label: "C=C (aromatic ~1600)" },
  { smarts: "c1ccccc1", peak: 1500, intensity: 40, width: 40, group: "aromatic-CC-1500", label: "C=C (aromatic ~1500)" },
  // C-O
  { smarts: "[CX3](=O)[OX2][#6]", peak: 1200, intensity: 60, width: 80, group: "ester-CO-single", label: "C–O (ester)" },
  { smarts: "[CX4][OX2H]", peak: 1050, intensity: 50, width: 80, group: "alcohol-CO", label: "C–O (alcohol)" },
  { smarts: "[NX3][CX4]", peak: 1250, intensity: 30, width: 60, group: "amine-CN", label: "C–N (amine)" },
  // Halogens (C-X stretch)
  { smarts: "[#6][Br]", peak: 600, intensity: 40, width: 40, group: "cbr", label: "C–Br" },
  { smarts: "[#6][Cl]", peak: 750, intensity: 40, width: 40, group: "ccl", label: "C–Cl" },
  // Nitro
  { smarts: "[NX3+](=O)[O-]", peak: 1520, intensity: 80, width: 40, group: "nitro-asym", label: "N=O (nitro, asym)" },
  { smarts: "[NX3+](=O)[O-]", peak: 1345, intensity: 60, width: 40, group: "nitro-sym", label: "N=O (nitro, sym)" },
];

interface RDKitLike {
  get_mol(smiles: string): Mol | null;
  get_qmol(smarts: string): Mol | null;
}

interface MolWithMatches {
  get_substruct_matches(query: Mol): string;
}

function matchAtoms(mol: MolWithMatches, rdkit: RDKitLike, smarts: string): number[][] {
  const q = rdkit.get_qmol(smarts);
  if (!q) return [];
  try {
    const raw = mol.get_substruct_matches(q);
    if (!raw || raw === "{}") return [];
    const parsed = JSON.parse(raw) as Array<{ atoms?: number[] }>;
    return parsed.map((m) => m.atoms ?? []);
  } catch {
    return [];
  } finally {
    q.delete();
  }
}

export function computeIrFromBandHits(hits: IrBand[]): IrSpectrum {
  // 4000 → 400 in 4 cm^-1 steps.
  const xs: number[] = [];
  for (let x = 4000; x >= 400; x -= 4) xs.push(x);
  const ys = xs.map((x) => {
    let absorbance = 0;
    for (const b of hits) {
      const dx = x - b.peak;
      // Gaussian; width is FWHM ≈ 2.355 σ
      const sigma = Math.max(b.width / 2.355, 1);
      absorbance += b.intensity * Math.exp(-(dx * dx) / (2 * sigma * sigma));
    }
    // Add a tiny bit of noise-like ripple in the fingerprint region for realism.
    if (x < 1500) absorbance += Math.sin(x * 0.11) * 1.5;
    return Math.max(0, Math.min(100, 100 - absorbance));
  });
  return { bands: hits, xs, ys };
}

export async function computeIr(mol: Mol): Promise<IrSpectrum> {
  const rdkit = (await getRDKitEither()) as unknown as RDKitLike;
  // Dedupe by group id: one Gaussian per functional-group class regardless
  // of how many atoms match. A slight bump in intensity for additional
  // matches keeps the visual cue that "this molecule has more C–H than that
  // one" without letting sp3-CH swamp the plot.
  const byGroup = new Map<string, IrBand>();
  for (const def of IR_TABLE) {
    const matches = matchAtoms(mol as MolWithMatches, rdkit, def.smarts);
    if (matches.length === 0) continue;
    const atomSet = new Set<number>();
    for (const m of matches) for (const a of m) atomSet.add(a);
    const existing = byGroup.get(def.group);
    if (existing) {
      for (const a of atomSet) existing.atomIndices.push(a);
      continue;
    }
    // Intensity boost caps at +50% for many matches; each match adds log2(1+n)*8.
    const boost = Math.min(50, Math.log2(1 + matches.length) * 8);
    byGroup.set(def.group, {
      peak: def.peak,
      intensity: Math.min(100, def.intensity + boost),
      width: def.width,
      group: def.group,
      label: def.label,
      atomIndices: [...atomSet],
    });
  }
  return computeIrFromBandHits([...byGroup.values()]);
}

export async function irForSmiles(smiles: string): Promise<IrSpectrum | null> {
  const rdkit = (await getRDKitEither()) as unknown as RDKitLike;
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    return null;
  }
  try {
    return await computeIr(mol);
  } finally {
    mol.delete();
  }
}
