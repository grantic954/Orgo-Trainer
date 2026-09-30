"use client";

import { StructureView } from "@/components/StructureView";

export interface DemoMolecule {
  name: string;
  smiles: string;
  highlightAtoms?: number[];
}

export function DemoGrid({ molecules }: { molecules: DemoMolecule[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {molecules.map((m) => (
        <figure
          key={m.name}
          className="flex flex-col items-center gap-2 rounded-md border border-neutral-200 bg-white p-3"
        >
          <StructureView
            smiles={m.smiles}
            width={260}
            height={180}
            highlightAtoms={m.highlightAtoms}
            title={m.name}
          />
          <figcaption className="text-center">
            <div className="text-sm font-medium">{m.name}</div>
            <div className="text-xs text-neutral-500 font-mono">{m.smiles}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
