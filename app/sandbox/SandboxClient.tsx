"use client";

import { useEffect, useRef, useState } from "react";
import { StructureEditor } from "@/components/StructureEditor";
import { StructureView } from "@/components/StructureView";
import { SpectrumPlot } from "@/components/SpectrumPlot";
import { irForSmiles, type IrSpectrum } from "@/lib/spectra/ir";
import { hnmrForSmiles, type HnmrSpectrum } from "@/lib/spectra/hnmr";
import { cnmrForSmiles, type CnmrSpectrum } from "@/lib/spectra/cnmr";
import { msForSmiles, type MsSpectrum } from "@/lib/spectra/ms";

type Tab = "ir" | "hnmr" | "cnmr" | "ms";

const TABS: { id: Tab; label: string }[] = [
  { id: "ir", label: "IR" },
  { id: "hnmr", label: "¹H NMR" },
  { id: "cnmr", label: "¹³C + DEPT" },
  { id: "ms", label: "MS" },
];

const STARTING_SMILES = "CC(=O)OCC";

export function SandboxClient() {
  const [smiles, setSmiles] = useState(STARTING_SMILES);
  const [debouncedSmiles, setDebouncedSmiles] = useState(STARTING_SMILES);
  const [tab, setTab] = useState<Tab>("ir");
  const [ir, setIr] = useState<IrSpectrum | null>(null);
  const [hn, setHn] = useState<HnmrSpectrum | null>(null);
  const [cn, setCn] = useState<CnmrSpectrum | null>(null);
  const [ms, setMs] = useState<MsSpectrum | null>(null);
  const [highlight, setHighlight] = useState<number[] | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedSmiles(smiles), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [smiles]);

  // Recompute all four when the debounced SMILES changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debouncedSmiles.trim()) {
        setIr(null); setHn(null); setCn(null); setMs(null);
        return;
      }
      const [i, h, c, m] = await Promise.all([
        irForSmiles(debouncedSmiles).catch(() => null),
        hnmrForSmiles(debouncedSmiles).catch(() => null),
        cnmrForSmiles(debouncedSmiles).catch(() => null),
        msForSmiles(debouncedSmiles).catch(() => null),
      ]);
      if (cancelled) return;
      setIr(i); setHn(h); setCn(c); setMs(m);
    })();
    return () => { cancelled = true; };
  }, [debouncedSmiles]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <StructureEditor
          initialSmiles={STARTING_SMILES}
          onChange={({ smiles }) => setSmiles(smiles)}
        />
        <div className="flex flex-col items-start gap-2 rounded border border-neutral-200 bg-white p-3 text-sm">
          <div className="font-mono text-xs text-neutral-500">SMILES: {smiles || "(empty)"}</div>
          <StructureView smiles={debouncedSmiles} width={220} height={140} highlightAtoms={highlight} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <nav className="flex gap-1 rounded border border-neutral-200 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                tab === t.id ? "bg-black text-white" : "hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="rounded border border-neutral-200 bg-white p-2">
          {tab === "ir" && ir && (
            <SpectrumPlot
              data={{ kind: "ir", spectrum: ir }}
              onPeakHover={(p) => setHighlight(p?.atomIndices)}
            />
          )}
          {tab === "hnmr" && hn && (
            <SpectrumPlot
              data={{ kind: "hnmr", spectrum: hn }}
              onPeakHover={(p) => setHighlight(p?.atomIndices)}
            />
          )}
          {tab === "cnmr" && cn && (
            <SpectrumPlot
              data={{ kind: "cnmr", spectrum: cn }}
              onPeakHover={(p) => setHighlight(p?.atomIndices)}
            />
          )}
          {tab === "ms" && ms && (
            <SpectrumPlot
              data={{ kind: "ms", spectrum: ms }}
              onPeakHover={(p) => setHighlight(p?.atomIndices)}
            />
          )}
          {tab === "ir" && !ir && <PlotPlaceholder />}
          {tab === "hnmr" && !hn && <PlotPlaceholder />}
          {tab === "cnmr" && !cn && <PlotPlaceholder />}
          {tab === "ms" && !ms && <PlotPlaceholder />}
        </div>
      </div>
    </div>
  );
}

function PlotPlaceholder() {
  return (
    <div className="flex h-[320px] items-center justify-center text-sm text-neutral-400">
      draw a structure to see this spectrum
    </div>
  );
}
