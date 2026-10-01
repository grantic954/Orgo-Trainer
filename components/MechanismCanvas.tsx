// MechanismCanvas: renders a structure via RDKit with explicit atom
// numbers, and provides a two-step picker (source atom(s) + sink atom)
// so the student can build an arrow list. The grader (lib/mechanism/
// schema.ts → gradeArrows) checks the arrow list order-independently.
//
// This is a Phase 1 implementation of the mechanism UX: atom-pick via
// numbered buttons rather than canvas-click. It's unambiguous and works
// cleanly across devices; a full click-on-SVG version can replace this
// without changing the data model.
"use client";

import { useEffect, useMemo, useState } from "react";
import { getRDKit } from "@/lib/chem/rdkit";
import {
  gradeArrows,
  type Arrow,
  type Step,
} from "@/lib/mechanism/schema";

interface AtomInfo {
  index: number;
  symbol: string;
}

interface SvgState {
  svg: string | null;
  atoms: AtomInfo[];
  error: string | null;
}

export function MechanismCanvas({ step }: { step: Step }) {
  const [{ svg, atoms, error }, setState] = useState<SvgState>({
    svg: null,
    atoms: [],
    error: null,
  });
  const [draft, setDraft] = useState<{
    sourceAtom?: number;
    sourceAtom2?: number;
    sinkAtom?: number;
  }>({});
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [sourceKind, setSourceKind] = useState<"lone-pair" | "bond">("lone-pair");
  const [result, setResult] = useState<ReturnType<typeof gradeArrows> | null>(null);

  // Render + parse structure.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rdkit = await getRDKit();
        const mol = rdkit.get_mol(step.smiles);
        if (!mol || !mol.is_valid()) {
          mol?.delete();
          if (!cancelled) setState({ svg: null, atoms: [], error: "invalid structure" });
          return;
        }
        try {
          // Draw with atom indices as labels.
          const svg = mol.get_svg_with_highlights(
            JSON.stringify({
              width: 480,
              height: 320,
              addAtomIndices: true,
            }),
          );
          const rawJson = (mol as unknown as { get_json(): string }).get_json();
          const parsed = JSON.parse(rawJson) as {
            defaults?: { atom?: { z?: number } };
            molecules?: Array<{ atoms: Array<{ z?: number }> }>;
          };
          const defaultZ = parsed.defaults?.atom?.z ?? 6;
          const atomInfos: AtomInfo[] = (parsed.molecules?.[0]?.atoms ?? []).map(
            (a, i) => ({ index: i, symbol: symbolFor(a.z ?? defaultZ) }),
          );
          if (!cancelled) setState({ svg, atoms: atomInfos, error: null });
        } finally {
          mol.delete();
        }
      } catch (e) {
        if (!cancelled)
          setState({
            svg: null,
            atoms: [],
            error: e instanceof Error ? e.message : String(e),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step.smiles]);

  // Reset the picker state when the step changes.
  useEffect(() => {
    setDraft({});
    setArrows([]);
    setResult(null);
  }, [step.smiles]);

  function addArrow() {
    if (draft.sinkAtom === undefined) return;
    if (sourceKind === "lone-pair") {
      if (draft.sourceAtom === undefined) return;
      setArrows((xs) => [
        ...xs,
        { sourceAtom: draft.sourceAtom!, sinkAtom: draft.sinkAtom! },
      ]);
    } else {
      if (draft.sourceAtom === undefined || draft.sourceAtom2 === undefined) return;
      setArrows((xs) => [
        ...xs,
        {
          sourceAtom: draft.sourceAtom!,
          sourceAtom2: draft.sourceAtom2!,
          sinkAtom: draft.sinkAtom!,
        },
      ]);
    }
    setDraft({});
  }

  function removeArrow(i: number) {
    setArrows((xs) => xs.filter((_, idx) => idx !== i));
  }

  function submit() {
    setResult(gradeArrows(step.expectedArrows, arrows));
  }

  const atomOptions = useMemo(
    () =>
      atoms.map((a) => (
        <option key={a.index} value={a.index}>
          {a.index}: {a.symbol}
        </option>
      )),
    [atoms],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded border border-neutral-200 bg-white p-3 text-sm">{step.prompt}</p>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not render: {error}
        </div>
      )}
      {svg && (
        <div
          className="rounded border border-neutral-200 bg-white p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <section className="flex flex-col gap-3 rounded border border-neutral-200 bg-white p-4">
        <header className="text-sm font-semibold">Add an arrow</header>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={sourceKind === "lone-pair"}
              onChange={() => setSourceKind("lone-pair")}
            />
            Lone pair / single-atom source
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={sourceKind === "bond"}
              onChange={() => setSourceKind("bond")}
            />
            Bond source
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Source atom</span>
            <select
              value={draft.sourceAtom ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sourceAtom: Number(e.target.value) }))
              }
              className="rounded border border-neutral-200 px-2 py-1"
            >
              <option value="">—</option>
              {atomOptions}
            </select>
          </label>

          {sourceKind === "bond" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Source atom 2 (other end of bond)</span>
              <select
                value={draft.sourceAtom2 ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sourceAtom2: Number(e.target.value) }))
                }
                className="rounded border border-neutral-200 px-2 py-1"
              >
                <option value="">—</option>
                {atomOptions}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Sink atom (arrow head)</span>
            <select
              value={draft.sinkAtom ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sinkAtom: Number(e.target.value) }))
              }
              className="rounded border border-neutral-200 px-2 py-1"
            >
              <option value="">—</option>
              {atomOptions}
            </select>
          </label>
        </div>

        <div>
          <button
            type="button"
            onClick={addArrow}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
          >
            + Add arrow
          </button>
        </div>
      </section>

      {arrows.length > 0 && (
        <section className="rounded border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Your arrows</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {arrows.map((a, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="font-mono text-xs">
                  {a.sourceAtom2 !== undefined
                    ? `(${a.sourceAtom}–${a.sourceAtom2})`
                    : `${a.sourceAtom}`}
                  {" → "}
                  {a.sinkAtom}
                </span>
                <button
                  type="button"
                  onClick={() => removeArrow(i)}
                  className="text-xs text-red-700 hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={arrows.length === 0}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Submit
        </button>
      </div>

      {result && (
        <section
          className={`rounded border px-4 py-3 text-sm ${
            result.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="font-medium">
            {result.correct ? "Correct" : "Not quite"} · matched {result.matched} /{" "}
            {step.expectedArrows.length}
          </div>
          {result.missing.length > 0 && (
            <div className="mt-1 text-xs">missing: {result.missing.length} arrow(s)</div>
          )}
          {result.extra.length > 0 && (
            <div className="text-xs">extra: {result.extra.length} arrow(s)</div>
          )}
          {step.explanation && !result.correct && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">Why?</summary>
              <p className="mt-1 whitespace-pre-line">{step.explanation}</p>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function symbolFor(z: number): string {
  const table: Record<number, string> = {
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
  return table[z] ?? `#${z}`;
}
