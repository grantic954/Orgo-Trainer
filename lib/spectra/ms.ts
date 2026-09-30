// Mass spectrum from structure — M+, isotope pattern, and rule-based
// fragmentations (alpha cleavage, loss of H2O, McLafferty, tropylium 91,
// acylium ions).

import { readMolProps, type AtomInfo, type MolProps } from "./nmr-common";

export interface MsPeak {
  mz: number;
  intensity: number; // relative 0..100
  label: string;
  atomIndices?: number[]; // atoms retained/lost, for future highlighting
}

export interface MsSpectrum {
  formula: string;
  monoMass: number;
  peaks: MsPeak[];
}

const MONO_MASS: Record<number, number> = {
  1: 1.00783,
  6: 12.0,
  7: 14.00307,
  8: 15.99491,
  9: 18.99840,
  15: 30.97376,
  16: 31.97207,
  17: 34.96885,
  35: 78.91834,
  53: 126.90447,
};

const ATOMIC_SYMBOL: Record<number, string> = {
  1: "H",
  6: "C",
  7: "N",
  8: "O",
  9: "F",
  15: "P",
  16: "S",
  17: "Cl",
  35: "Br",
  53: "I",
};

function countAtoms(props: MolProps): Record<number, number> {
  const c: Record<number, number> = {};
  for (const a of props.atoms) {
    c[a.z] = (c[a.z] ?? 0) + 1;
    if (a.impHs > 0) c[1] = (c[1] ?? 0) + a.impHs;
  }
  return c;
}

function formulaString(counts: Record<number, number>): string {
  const order = [6, 1, 7, 8, 9, 15, 16, 17, 35, 53];
  let s = "";
  for (const z of order) {
    if (counts[z]) {
      s += ATOMIC_SYMBOL[z];
      if (counts[z] > 1) s += counts[z];
    }
  }
  for (const z of Object.keys(counts).map(Number)) {
    if (!order.includes(z)) {
      s += ATOMIC_SYMBOL[z] ?? `Z${z}`;
      if (counts[z] > 1) s += counts[z];
    }
  }
  return s;
}

function monoMass(counts: Record<number, number>): number {
  let m = 0;
  for (const [z, n] of Object.entries(counts)) {
    m += (MONO_MASS[Number(z)] ?? 0) * n;
  }
  return Math.round(m * 1000) / 1000;
}

function isCarbonyl(props: MolProps, ci: number): boolean {
  const a = props.atoms[ci];
  return a.z === 6 && a.neighbors.some((j, k) => props.atoms[j].z === 8 && a.bondOrders[k] === 2);
}

function isAlcoholC(props: MolProps, ci: number): boolean {
  const a = props.atoms[ci];
  return a.z === 6 && a.neighbors.some((j, k) => {
    const nb = props.atoms[j];
    return nb.z === 8 && a.bondOrders[k] === 1 && nb.impHs === 1;
  });
}

function hasBenzyl(props: MolProps): boolean {
  // Very rough: an sp3 CH2 (or CH3) attached to an aromatic ring atom.
  return props.atoms.some(
    (a) => a.z === 6 && !a.isAromatic && a.impHs >= 2 &&
      a.neighbors.some((j) => props.atoms[j].isAromatic),
  );
}

function hasAlphaHydrogenToCarbonyl(props: MolProps, ci: number): boolean {
  const c = props.atoms[ci];
  return c.neighbors.some((j) => {
    const nb = props.atoms[j];
    return nb.z === 6 && nb.impHs > 0;
  });
}

export function predictMs(props: MolProps): MsSpectrum {
  const counts = countAtoms(props);
  const formula = formulaString(counts);
  const m = monoMass(counts);
  const peaks: MsPeak[] = [];
  const M = Math.round(m);

  peaks.push({ mz: M, intensity: 100, label: "M⁺" });

  // Isotope pattern
  const nC = counts[6] ?? 0;
  if (nC > 0) peaks.push({ mz: M + 1, intensity: Math.min(30, nC * 1.1), label: "M+1 (¹³C)" });
  const nCl = counts[17] ?? 0;
  const nBr = counts[35] ?? 0;
  if (nCl > 0) peaks.push({ mz: M + 2, intensity: 100 / 3, label: "M+2 (³⁷Cl)" });
  if (nBr > 0) peaks.push({ mz: M + 2, intensity: 100, label: "M+2 (⁸¹Br)" });

  // Fragmentations
  const carbonyls = props.atoms.filter((a) => isCarbonyl(props, a.index));
  for (const c of carbonyls) {
    // Alpha cleavage: lose one alkyl neighbor as radical
    for (const j of c.neighbors) {
      const nb = props.atoms[j];
      if (nb.z !== 6) continue;
      const nbCounts = countAtoms({ atoms: [nb] });
      const lostMass = Math.round(monoMass(nbCounts) + nb.impHs);
      const frag = M - lostMass;
      if (frag > 15 && !peaks.some((p) => p.mz === frag && p.label.includes("α-cleavage"))) {
        peaks.push({
          mz: frag,
          intensity: 60,
          label: `α-cleavage (lose CH${nb.impHs} fragment)`,
          atomIndices: [nb.index],
        });
      }
    }
    // Acylium (M - OR / - alkyl)
    peaks.push({ mz: M - 29, intensity: 40, label: "acylium (M−CHO)" });
    // McLafferty needs γ-H
    if (hasAlphaHydrogenToCarbonyl(props, c.index)) {
      peaks.push({ mz: M - 42, intensity: 30, label: "McLafferty (M−C3H6)" });
    }
  }

  // Alcohol: lose H2O (18)
  if (props.atoms.some((a) => isAlcoholC(props, a.index))) {
    peaks.push({ mz: M - 18, intensity: 45, label: "M−H2O" });
  }

  // Benzyl → tropylium 91
  if (hasBenzyl(props)) {
    peaks.push({ mz: 91, intensity: 55, label: "tropylium C7H7⁺" });
  }

  // Aromatic ring → phenyl cation 77
  if (props.atoms.some((a) => a.isAromatic && a.z === 6)) {
    peaks.push({ mz: 77, intensity: 25, label: "phenyl C6H5⁺" });
  }

  // Dedupe on (mz, label)
  const seen = new Set<string>();
  const unique = peaks.filter((p) => {
    const k = `${p.mz}|${p.label}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).filter((p) => p.mz > 0);

  return { formula, monoMass: m, peaks: unique.sort((a, b) => a.mz - b.mz) };
}

function _mkAtom(z: number, impHs = 0): AtomInfo {
  return { index: 0, z, impHs, chg: 0, isAromatic: false, neighbors: [], bondOrders: [] };
}

export async function msForSmiles(smiles: string): Promise<MsSpectrum | null> {
  const parsed = await readMolProps(smiles);
  if (!parsed) return null;
  try {
    return predictMs(parsed.props);
  } finally {
    parsed.mol.delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepReferenced = _mkAtom;
