// Renders a stack of spectra for a given SMILES. Used inside QuestionCard
// so Ch 14-style "identify this compound" exam questions can show the
// actual IR / MS / NMR of the mystery molecule.
"use client";

import { useEffect, useState } from "react";
import { SpectrumPlot } from "@/components/SpectrumPlot";
import { irForSmiles, type IrSpectrum } from "@/lib/spectra/ir";
import { msForSmiles, type MsSpectrum } from "@/lib/spectra/ms";
import { hnmrForSmiles, type HnmrSpectrum } from "@/lib/spectra/hnmr";
import { cnmrForSmiles, type CnmrSpectrum } from "@/lib/spectra/cnmr";

type Kind = "ir" | "hnmr" | "cnmr" | "ms";

interface State {
  ir: IrSpectrum | null;
  ms: MsSpectrum | null;
  hnmr: HnmrSpectrum | null;
  cnmr: CnmrSpectrum | null;
  loading: boolean;
}

const TITLES: Record<Kind, string> = {
  ir: "IR spectrum",
  ms: "Mass spectrum",
  hnmr: "¹H NMR",
  cnmr: "¹³C NMR + DEPT",
};

export function SpectrumPanel({
  smiles,
  kinds,
}: {
  smiles: string;
  kinds: Kind[];
}) {
  const [state, setState] = useState<State>({
    ir: null,
    ms: null,
    hnmr: null,
    cnmr: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const need = new Set(kinds);
      const [ir, ms, hn, cn] = await Promise.all([
        need.has("ir") ? irForSmiles(smiles).catch(() => null) : null,
        need.has("ms") ? msForSmiles(smiles).catch(() => null) : null,
        need.has("hnmr") ? hnmrForSmiles(smiles).catch(() => null) : null,
        need.has("cnmr") ? cnmrForSmiles(smiles).catch(() => null) : null,
      ]);
      if (cancelled) return;
      setState({ ir, ms, hnmr: hn, cnmr: cn, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [smiles, kinds]);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <header className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Spectra of the unknown compound
      </header>
      {state.loading && (
        <div className="rounded border border-neutral-100 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Rendering spectra…
        </div>
      )}
      {!state.loading &&
        kinds.map((k) => {
          const content =
            k === "ir" && state.ir ? (
              <SpectrumPlot data={{ kind: "ir", spectrum: state.ir }} hideMarkers />
            ) : k === "ms" && state.ms ? (
              <SpectrumPlot data={{ kind: "ms", spectrum: state.ms }} hideMarkers />
            ) : k === "hnmr" && state.hnmr ? (
              <SpectrumPlot data={{ kind: "hnmr", spectrum: state.hnmr }} hideMarkers />
            ) : k === "cnmr" && state.cnmr ? (
              <SpectrumPlot data={{ kind: "cnmr", spectrum: state.cnmr }} hideMarkers />
            ) : null;
          return (
            <div key={k} className="rounded border border-neutral-100 bg-white p-2">
              <div className="mb-1 text-xs font-medium text-neutral-600">{TITLES[k]}</div>
              {content}
            </div>
          );
        })}
    </section>
  );
}
