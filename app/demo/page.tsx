// Phase 1 demo: render 10 varied structures via RDKit.
import { DemoGrid } from "./DemoGrid";

const MOLECULES = [
  { name: "Benzene", smiles: "c1ccccc1" },
  { name: "Toluene", smiles: "Cc1ccccc1" },
  { name: "Phenol", smiles: "Oc1ccccc1" },
  { name: "Aspirin", smiles: "CC(=O)Oc1ccccc1C(=O)O" },
  { name: "Caffeine", smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C" },
  { name: "(R)-2-Butanol", smiles: "C[C@H](O)CC" },
  { name: "(S)-Ibuprofen", smiles: "CC(C)Cc1ccc(cc1)[C@@H](C)C(=O)O" },
  { name: "Pyridine", smiles: "c1ccncc1" },
  { name: "Furan", smiles: "c1ccoc1" },
  { name: "Cyclohexanone (highlight C=O)", smiles: "O=C1CCCCC1", highlightAtoms: [0, 1] },
] as const;

export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Phase 1 demo</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ten test molecules rendered by RDKit.js. The last one highlights the C=O to prove atom
          highlighting works.
        </p>
      </header>
      <DemoGrid molecules={MOLECULES.map((m) => ({ ...m, highlightAtoms: [...(m as { highlightAtoms?: number[] }).highlightAtoms ?? []] }))} />
    </main>
  );
}
