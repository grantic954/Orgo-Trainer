"use client";

import { useState } from "react";
import type { Ketcher } from "ketcher-core";
import { StructureView } from "@/components/StructureView";
import { activateTool, clearCanvas, redo, undo, type ToolId } from "@/lib/ketcher/tools";
import { RING_SMILES } from "@/lib/ketcher/templates";

interface ToolDef {
  id: ToolId;
  label: string;
  hint?: string;
}

interface TemplateDef {
  id: ToolId;
  name: string;
}

const TEMPLATE_TOOLS: TemplateDef[] = [
  { id: "ring-benzene", name: "Benzene" },
  { id: "ring-cyclohexane", name: "Cyclohexane" },
  { id: "ring-cyclopentane", name: "Cyclopentane" },
  { id: "ring-cyclobutane", name: "Cyclobutane" },
  { id: "ring-cyclopropane", name: "Cyclopropane" },
  { id: "ring-cycloheptane", name: "Cycloheptane" },
];

const BOND_TOOLS: ToolDef[] = [
  { id: "bond-single", label: "—", hint: "Single bond" },
  { id: "bond-double", label: "=", hint: "Double bond" },
  { id: "bond-triple", label: "≡", hint: "Triple bond" },
  { id: "chain", label: "⌇", hint: "Chain — click and drag to draw any length" },
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
  { id: "lone-pair", label: "··", hint: "Lone pair" },
  { id: "reaction-arrow", label: "→", hint: "Reaction arrow" },
];

const SELECTION_TOOLS: ToolDef[] = [
  { id: "select-rect", label: "▭", hint: "Rectangle select (drag)" },
  { id: "select-fragment", label: "⬡", hint: "Fragment select — click a molecule to select the whole thing" },
  { id: "hand", label: "✋", hint: "Pan the canvas (drag to scroll)" },
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
  function filter<T extends { id: ToolId }>(defs: T[]): T[] {
    return defs.filter((d) => has(d.id));
  }
  const templates = filter(TEMPLATE_TOOLS);
  const bonds = filter(BOND_TOOLS);
  const atoms = filter(ATOM_TOOLS);
  const other = filter(OTHER_TOOLS);
  const selection = filter(SELECTION_TOOLS);

  async function click(id: ToolId) {
    if (!ketcher) return;
    setActive(id);
    await activateTool(ketcher, id);
  }

  return (
    <div className="flex flex-wrap items-stretch gap-3 rounded-md border border-neutral-200 bg-white p-2 text-sm">
      {templates.length > 0 && (
        <TemplateSection templates={templates} active={active} onClick={click} />
      )}
      {bonds.length > 0 && <Section title="Bonds" tools={bonds} active={active} onClick={click} />}
      {atoms.length > 0 && <Section title="Atoms" tools={atoms} active={active} onClick={click} />}
      {other.length > 0 && <Section title="Other" tools={other} active={active} onClick={click} />}
      {selection.length > 0 && (
        <Section title="Select" tools={selection} active={active} onClick={click} />
      )}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Undo</div>
        <div className="flex flex-wrap gap-0.5">
          <ToolButton label="↶" hint="Undo" onClick={() => ketcher && undo(ketcher)} active={false} />
          <ToolButton label="↷" hint="Redo" onClick={() => ketcher && redo(ketcher)} active={false} />
          <ToolButton
            label="Clear"
            hint="Clear canvas"
            onClick={() => ketcher && clearCanvas(ketcher)}
            active={false}
            wide
          />
        </div>
      </div>
    </div>
  );
}

function TemplateSection({
  templates,
  active,
  onClick,
}: {
  templates: TemplateDef[];
  active: ToolId | null;
  onClick: (id: ToolId) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Templates</div>
      <div className="flex flex-wrap gap-0.5">
        {templates.map((t) => {
          const smiles = RING_SMILES[t.id];
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.name}
              aria-label={t.name}
              onClick={() => onClick(t.id)}
              className={`flex h-14 w-14 items-center justify-center rounded border p-0.5 transition ${
                isActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-neutral-200 bg-white hover:bg-neutral-100"
              }`}
            >
              {smiles ? <StructureView smiles={smiles} width={50} height={46} /> : t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  title,
  tools,
  active,
  onClick,
}: {
  title: string;
  tools: ToolDef[];
  active: ToolId | null;
  onClick: (id: ToolId) => void;
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
