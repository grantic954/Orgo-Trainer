// Shared helpers for 1H / 13C NMR: parses RDKit's molecule JSON, exposes per-atom
// properties, and derives environment signatures used to group chemically
// equivalent atoms.

import type { Mol } from "@rdkit/rdkit";
import { getRDKitEither } from "./rdkit-env";

export interface AtomInfo {
  index: number;
  z: number;      // atomic number
  impHs: number;  // implicit Hs
  chg: number;    // formal charge
  isAromatic: boolean;
  neighbors: number[];         // atom indices
  bondOrders: number[];        // parallel to neighbors (1/2/3; aromatic ≈ 1.5)
  cipRank?: number;
}

export interface MolProps {
  atoms: AtomInfo[];
}

interface RawAtom {
  z?: number;
  impHs?: number;
  chg?: number;
  stereo?: string;
}

interface RawBond {
  bo?: number;
  atoms: [number, number];
}

interface RawExtension {
  name: string;
  cipRanks?: number[];
  aromaticAtoms?: number[];
  aromaticBonds?: number[];
}

interface RawMol {
  atoms: RawAtom[];
  bonds: RawBond[];
  extensions?: RawExtension[];
}

interface RawJson {
  defaults?: { atom?: RawAtom; bond?: RawBond };
  molecules?: RawMol[];
}

interface MolWithGetJson {
  get_json(): string;
}

interface RDKitLike {
  get_mol(smiles: string): Mol | null;
}

export async function readMolProps(smiles: string): Promise<{ mol: Mol; props: MolProps } | null> {
  const rdkit = (await getRDKitEither()) as unknown as RDKitLike;
  const mol = rdkit.get_mol(smiles);
  if (!mol || !mol.is_valid()) {
    mol?.delete();
    return null;
  }
  const raw = (mol as unknown as MolWithGetJson).get_json();
  let json: RawJson;
  try {
    json = JSON.parse(raw);
  } catch {
    mol.delete();
    return null;
  }
  const rm = json.molecules?.[0];
  if (!rm) {
    mol.delete();
    return null;
  }
  const defAtom: RawAtom = { z: 6, impHs: 0, chg: 0, ...json.defaults?.atom };
  const defBond: RawBond = { bo: 1, atoms: [0, 0], ...json.defaults?.bond };
  const cipRanks: number[] | undefined = rm.extensions?.find((e) => e.name === "rdkitRepresentation")
    ?.cipRanks;
  const rep = rm.extensions?.find((e) => e.name === "rdkitRepresentation");
  const aromaticAtoms = new Set(rep?.aromaticAtoms ?? []);
  const aromaticBonds = new Set(rep?.aromaticBonds ?? []);

  const atoms: AtomInfo[] = rm.atoms.map((a, i) => ({
    index: i,
    z: a.z ?? defAtom.z ?? 6,
    impHs: a.impHs ?? defAtom.impHs ?? 0,
    chg: a.chg ?? defAtom.chg ?? 0,
    isAromatic: aromaticAtoms.has(i),
    neighbors: [],
    bondOrders: [],
    cipRank: cipRanks?.[i],
  }));

  rm.bonds.forEach((b, bi) => {
    const bo = b.bo ?? defBond.bo ?? 1;
    const effBo = aromaticBonds.has(bi) ? 1.5 : bo;
    const [ai, aj] = b.atoms;
    atoms[ai].neighbors.push(aj);
    atoms[ai].bondOrders.push(effBo);
    atoms[aj].neighbors.push(ai);
    atoms[aj].bondOrders.push(effBo);
  });

  return { mol, props: { atoms } };
}

// Signature that groups chemically equivalent atoms. Preferred: RDKit's CIP
// rank. Fallback: recursive local environment string.
export function computeEnvSignatures(props: MolProps): string[] {
  const { atoms } = props;
  if (atoms.every((a) => a.cipRank !== undefined)) {
    return atoms.map((a) => `cip:${a.cipRank}`);
  }
  const l0 = atoms.map((a) =>
    `z${a.z}|h${a.impHs}|c${a.chg}|ar${a.isAromatic ? 1 : 0}|d${a.neighbors.length}`,
  );
  const l1 = atoms.map((a) => {
    const nb = a.neighbors.map((j) => l0[j]).sort().join(",");
    return `${l0[a.index]}||${nb}`;
  });
  const l2 = atoms.map((a) => {
    const nb = a.neighbors.map((j) => l1[j]).sort().join(",");
    return `${l1[a.index]}||${nb}`;
  });
  return l2;
}

export function neighborsOf(props: MolProps, i: number): AtomInfo[] {
  return props.atoms[i].neighbors.map((j) => props.atoms[j]);
}

export function isCarbon(a: AtomInfo): boolean {
  return a.z === 6;
}
