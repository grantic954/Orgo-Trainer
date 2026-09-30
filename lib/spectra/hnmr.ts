// 1H NMR generation — textbook-style predictions.
//
// Pipeline:
//   1. Parse SMILES → per-atom properties.
//   2. Group Hs by the CIP-rank of their carbon.
//   3. Predict shift per group via a small additive-substituent table.
//   4. Split each group by first-order (n+1) coupling to neighboring
//      non-equivalent H-bearing carbons; OH/NH shown as broad singlets.
//   5. Emit both peak metadata (for hover/click) and a sampled Lorentzian
//      curve for plotting.

import type { Mol } from "@rdkit/rdkit";
import { computeEnvSignatures, isCarbon, readMolProps, type AtomInfo, type MolProps } from "./nmr-common";

export interface HnmrPeak {
  shift: number;       // ppm
  integration: number; // number of H
  multiplicity: string; // 's', 'd', 't', 'q', 'quint', 'sext', 'sept', 'm'
  atomIndices: number[]; // carbon or heteroatom the Hs are attached to
  environment: string;  // signature
  note?: string;        // e.g., 'exchangeable'
}

export interface HnmrSpectrum {
  peaks: HnmrPeak[];
  xs: number[]; // ppm 12 → 0
  ys: number[]; // arbitrary intensity
}

const MULTIPLICITY = ["s", "d", "t", "q", "quint", "sext", "sept"];

function shiftForCarbon(a: AtomInfo, props: MolProps): number {
  const nbs = a.neighbors.map((j) => props.atoms[j]);
  const attachedZ = nbs.map((n) => n.z);

  // Aromatic C-H
  if (a.isAromatic) return 7.3;

  // Aldehyde H — C=O with H
  const hasDoubleBondToO = nbs.some((n, k) => n.z === 8 && a.bondOrders[k] === 2);
  if (hasDoubleBondToO && a.impHs > 0) return 9.7;

  // Alpha to C=O (ketone/aldehyde/ester acyl side)
  const alphaToCarbonyl = nbs.some((n) => {
    if (n.z !== 6) return false;
    const nn = props.atoms[n.index];
    return nn.neighbors.some((k, idx) => props.atoms[k].z === 8 && nn.bondOrders[idx] === 2);
  });

  // O-CH (ester alkoxy / ether / alcohol)
  const attachedToO = attachedZ.includes(8);

  // N-CH
  const attachedToN = attachedZ.includes(7);

  // CX (halide)
  const attachedToHalide = attachedZ.some((z) => z === 9 || z === 17 || z === 35 || z === 53);

  // Vinyl CH
  const isVinyl = a.neighbors.some((j, k) => props.atoms[j].z === 6 && a.bondOrders[k] === 2);

  let base = 0.9;
  if (isVinyl) base = 5.5;
  else if (attachedToO) base = 3.7;
  else if (attachedToN) base = 2.7;
  else if (attachedToHalide) base = 3.4;
  else if (alphaToCarbonyl) base = 2.2;
  else base = 0.9 + 0.3 * (nbs.filter((n) => n.z === 6).length - 1); // 1° 0.9 → higher

  return round1(base);
}

function shiftForHeteroatomH(a: AtomInfo): number {
  if (a.z === 8) return 2.5; // O-H alcohol; COOH handled elsewhere ~12
  if (a.z === 7) return 1.5; // N-H amine
  return 4.5;
}

function neighborCarbonsWithHs(props: MolProps, carbonIdx: number): AtomInfo[] {
  const c = props.atoms[carbonIdx];
  return c.neighbors
    .map((j) => props.atoms[j])
    .filter((n) => isCarbon(n) && n.impHs > 0);
}

function multiplicityFor(nNeighborHs: number): string {
  if (nNeighborHs === 0) return "s";
  if (nNeighborHs <= 6) return MULTIPLICITY[nNeighborHs];
  return "m";
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function predictHnmr(props: MolProps): HnmrPeak[] {
  const sigs = computeEnvSignatures(props);
  // Group Hs by the environment of their bearer atom (carbon or heteroatom with impHs).
  const groups = new Map<string, number[]>();
  for (const a of props.atoms) {
    if (a.impHs === 0) continue;
    const s = sigs[a.index];
    const arr = groups.get(s) ?? [];
    arr.push(a.index);
    groups.set(s, arr);
  }

  const peaks: HnmrPeak[] = [];
  for (const [sig, indices] of groups) {
    const a0 = props.atoms[indices[0]];
    const integration = indices.reduce((sum, i) => sum + props.atoms[i].impHs, 0);
    let shift: number;
    let mult: string;
    let note: string | undefined;
    if (isCarbon(a0)) {
      shift = shiftForCarbon(a0, props);
      // Splitting: count distinct-environment neighboring carbons' Hs
      const nbCarbons = neighborCarbonsWithHs(props, a0.index);
      const nbEnvs = new Set(nbCarbons.map((n) => sigs[n.index]));
      let nHs = 0;
      for (const env of nbEnvs) {
        const rep = nbCarbons.find((n) => sigs[n.index] === env);
        if (rep) nHs += rep.impHs;
      }
      // If the carbon itself has equivalent H peers, they don't couple to each other.
      mult = multiplicityFor(nHs);
    } else {
      shift = shiftForHeteroatomH(a0);
      mult = "s";
      note = "exchangeable";
    }
    peaks.push({
      shift,
      integration,
      multiplicity: mult,
      atomIndices: indices,
      environment: sig,
      note,
    });
  }
  return peaks.sort((a, b) => b.shift - a.shift);
}

export function computeHnmrCurve(peaks: HnmrPeak[]): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  for (let x = 12; x >= 0; x -= 0.02) xs.push(round1(x * 100) / 100);
  const gamma = 0.03; // Lorentzian half-width in ppm
  const ys = xs.map((x) => {
    let y = 0;
    for (const p of peaks) {
      y += (p.integration * gamma * gamma) / ((x - p.shift) ** 2 + gamma * gamma);
    }
    return y;
  });
  return { xs, ys };
}

export async function hnmrForSmiles(smiles: string): Promise<HnmrSpectrum | null> {
  const parsed = await readMolProps(smiles);
  if (!parsed) return null;
  try {
    const peaks = predictHnmr(parsed.props);
    const { xs, ys } = computeHnmrCurve(peaks);
    return { peaks, xs, ys };
  } finally {
    parsed.mol.delete();
  }
}
