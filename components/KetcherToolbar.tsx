"use client";

import { useState } from "react";
import type { Ketcher } from "ketcher-core";
import { activateTool, clearCanvas, redo, undo, type ToolId } from "@/lib/ketcher/tools";

interface ToolDef {
  id: ToolId;
  label: string;
  hint?: string;
}

const RING_TOOLS: ToolDef[] = [
  { id: "ring-benzene", label: "Ph", hint: "Benzene" },
  { id: "ring-cyclohexane", label: "6", hint: "Cyclohexane" },
  { id: "ring-cyclopentane", label: "5", hint: "Cyclopentane" },
  { id: "ring-cyclobutane", label: "4", hint: "Cyclobutane" },
  { id: "ring-cyclopropane", label: "3", hint: "Cyclopropane" },
  { id: "ring-cycloheptane", label: "7", hint: "Cycloheptane" },
  { id: "ring-furan", label: "Fu", hint: "Furan" },
  { id: "ring-pyridine", label: "Py", hint: "Pyridine" },
];

const BOND_TOOLS: ToolDef[] = [
  { id: "bond-single", label: "—", hint: "Single bond" },
  { id: "bond-double", label: "=", hint: "Double bond" },
  { id: "bond-triple", label: "≡", hint: "Triple bond" },
  { id: "bond-aromatic", label: "◊", hint: "Aromatic bond" },
  { id: "bond-up", label: "▲", hint: "Wedge up (stereo)" },
  { id: "bond-down", label: "⋮", hint: "Hashed down (stereo)" },
];

const ATOM_TOOLS: ToolDef[] = [
  { id: "atom-C", label: "C" },
  { id: "atom-H", label: "H" },
  { id: "atom-O", label: "O" },
  { id: "atom-N", label: "N" },
  { id: "atom-F", label: "F" },
  { id: "atom-Cl", label: "Cl" },
  { id: "atom-Br", label: "Br" },
  { id: "atom-I", label: "I" },
  { id: "atom-S", label: "S" },
  { id: "atom-P", label: "P" },
];

const OTHER_TOOLS: ToolDef[] = [
  { id: "charge-plus", label: "+", hint: "Positive charge" },
  { id: "charge-minus", label: "−", hint: "Negative charge" },
  { id: "electron-pair", label: "··", hint: "Lone pair" },
  { id: "reaction-arrow", label: "→", hint: "Reaction arrow" },
];

const SELECTION_TOOLS: ToolDef[] = [
  { id: "select-rect", label: "▭", hint: "Select (drag to lasso)" },
  { id: "erase", label: "⌫", hint: "Erase" },
];

export interface KetcherToolbarProps {
  ketcher: Ketcher | null;
  allow: Set<ToolId>;
}

export function KetcherToolbar({ ketcher, allow }: KetcherToolbarProps) {
  const [active, setActive] = useState<ToolId | null>("bond-single");

  function has(id: ToolId): boolean {
    return allow.has(id);
  }
  function section(defs: ToolDef[]): ToolDef[] {
    return defs.filter((d) => has(d.id));
  }
  const rings = section(RING_TOOLS);
  const bonds = section(BOND_TOOLS);
  const atoms = section(ATOM_TOOLS);
  const other = section(OTHER_TOOLS);
  const selection = section(SELECTION_TOOLS);

  async function click(id: ToolId) {
    if (!ketcher) return;
    setActive(id);
    await activateTool(ketcher, id);
  }

  return (
    <div className="flex flex-wrap items-stretch gap-3 rounded-md border border-neutral-200 bg-white p-2 text-sm">
      {rings.length > 0 && <Section title="Templates" tools={rings} active={active} onClick={click} />}
      {bonds.length > 0 && <Section title="Bonds" tools={bonds} active={active} onClick={click} />}
      {atoms.length > 0 && <Section title="Atoms" tools={atoms} active={active} onClick={click} />}
      {other.length > 0 && <Section title="Other" tools={other} active={active} onClick={click} />}
      {selection.length > 0 && (
        <Section title="Select" tools={selection} active={active} onClick={click} />
      )}
      <Section
        title="Undo"
        tools={[]}
        active={active}
        onClick={click}
        extra={
          <>
            <ToolButton
              label="↶"
              hint="Undo"
              onClick={() => ketcher && undo(ketcher)}
              active={false}
            />
            <ToolButton
              label="↷"
              hint="Redo"
              onClick={() => ketcher && redo(ketcher)}
              active={false}
            />
            <ToolButton
              label="Clear"
              hint="Clear canvas"
              onClick={() => ketcher && clearCanvas(ketcher)}
              active={false}
              wide
            />
          </>
        }
      />
    </div>
  );
}

function Section({
  title,
  tools,
  active,
  onClick,
  extra,
}: {
  title: string;
  tools: ToolDef[];
  active: ToolId | null;
  onClick: (id: ToolId) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{title}</div>
      <div className="flex flex-wrap gap-0.5">
        {tools.map((t) => (
          <ToolButton
            key={t.id}
            label={t.label}
            hint={t.hint}
            active={active === t.id}
            onClick={() => onClick(t.id)}
          />
        ))}
        {extra}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  hint,
  active,
  onClick,
  wide,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={hint}
      aria-label={hint ?? label}
      onClick={onClick}
      className={`${wide ? "px-2" : "w-8"} h-8 rounded border text-sm font-medium leading-none transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-800"
          : "border-neutral-200 bg-white hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );
}
