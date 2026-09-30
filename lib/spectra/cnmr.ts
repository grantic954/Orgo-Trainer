// 13C NMR + DEPT (90 / 135) — textbook shift ranges.

import { computeEnvSignatures, isCarbon, readMolProps, type AtomInfo, type MolProps } from "./nmr-common";

export interface CnmrPeak {
  shift: number;
  atomIndices: number[];
  environment: string;
  hCount: number;             // Hs on this carbon
  dept90: number;             // +1 CH, 0 otherwise
  dept135: number;            // +1 CH/CH3, -1 CH2, 0 quaternary
}

export interface CnmrSpectrum {
  peaks: CnmrPeak[];
}

function shiftForCarbon(a: AtomInfo, props: MolProps): number {
  const nbs = a.neighbors.map((j) => props.atoms[j]);
  const bo = a.bondOrders;

  const hasDoubleBondToO = a.neighbors.some((j, k) => props.atoms[j].z === 8 && bo[k] === 2);
  const hasSingleBondToO = a.neighbors.some((j, k) => props.atoms[j].z === 8 && bo[k] === 1);
  const attachedToO = nbs.some((n) => n.z === 8);
  const attachedToN = nbs.some((n) => n.z === 7);
  const isVinyl = a.neighbors.some((j, k) => props.atoms[j].z === 6 && bo[k] === 2 && !props.atoms[j].isAromatic);
  const isAlkyne = a.neighbors.some((j, k) => props.atoms[j].z === 6 && bo[k] === 3);

  if (hasDoubleBondToO) {
    // C=O carbons — differentiate by additional neighbors (beyond the =O itself).
    if (hasSingleBondToO) return 172;   // ester/COOH: has =O and separate -O-
    if (attachedToN) return 168;        // amide
    if (a.impHs > 0) return 191;        // aldehyde
    return 205;                          // ketone
  }
  if (a.isAromatic) return 128;
  if (isVinyl) return 128;
  if (isAlkyne) return 85;
  if (attachedToO) return 68;
  if (attachedToN) return 45;
  // sp3 based on degree
  return 15 + 8 * nbs.filter((n) => n.z === 6).length;
}

export function predictCnmr(props: MolProps): CnmrPeak[] {
  const sigs = computeEnvSignatures(props);
  const groups = new Map<string, number[]>();
  for (const a of props.atoms) {
    if (!isCarbon(a)) continue;
    const s = sigs[a.index];
    const arr = groups.get(s) ?? [];
    arr.push(a.index);
    groups.set(s, arr);
  }
  const peaks: CnmrPeak[] = [];
  for (const [sig, indices] of groups) {
    const a0 = props.atoms[indices[0]];
    const h = a0.impHs;
    const dept90 = h === 1 ? 1 : 0;
    const dept135 = h === 0 ? 0 : h === 2 ? -1 : 1;
    peaks.push({
      shift: Math.round(shiftForCarbon(a0, props) * 10) / 10,
      atomIndices: indices,
      environment: sig,
      hCount: h,
      dept90,
      dept135,
    });
  }
  return peaks.sort((a, b) => b.shift - a.shift);
}

export async function cnmrForSmiles(smiles: string): Promise<CnmrSpectrum | null> {
  const parsed = await readMolProps(smiles);
  if (!parsed) return null;
  try {
    return { peaks: predictCnmr(parsed.props) };
  } finally {
    parsed.mol.delete();
  }
}
