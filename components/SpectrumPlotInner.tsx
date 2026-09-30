// Plotly-backed spectrum renderer. Loaded via dynamic import from
// SpectrumPlot so the heavy plotly bundle stays off the initial payload.
"use client";

import { useMemo } from "react";
// react-plotly.js needs a Plotly instance passed to it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Plot = require("react-plotly.js").default as React.ComponentType<Record<string, unknown>>;
import type { IrSpectrum } from "@/lib/spectra/ir";
import type { HnmrSpectrum } from "@/lib/spectra/hnmr";
import type { CnmrSpectrum } from "@/lib/spectra/cnmr";
import type { MsSpectrum } from "@/lib/spectra/ms";

export type SpectrumKind = "ir" | "hnmr" | "cnmr" | "ms";

type SpectrumData =
  | { kind: "ir"; spectrum: IrSpectrum }
  | { kind: "hnmr"; spectrum: HnmrSpectrum }
  | { kind: "cnmr"; spectrum: CnmrSpectrum }
  | { kind: "ms"; spectrum: MsSpectrum };

export interface SpectrumPlotInnerProps {
  data: SpectrumData;
  onPeakClick?: (payload: { label: string; atomIndices?: number[] }) => void;
  onPeakHover?: (payload: { label: string; atomIndices?: number[] } | null) => void;
}

export default function SpectrumPlotInner({ data, onPeakClick, onPeakHover }: SpectrumPlotInnerProps) {
  const { plotData, layout } = useMemo(() => buildPlot(data), [data]);
  return (
    <Plot
      data={plotData as unknown as never}
      layout={layout as unknown as never}
      config={{ displayModeBar: false, responsive: true } as unknown as never}
      useResizeHandler
      style={{ width: "100%", height: "320px" }}
      onClick={(evt: { points?: Array<{ customdata?: unknown; text?: string }> }) => {
        const p = evt.points?.[0];
        if (!p || !onPeakClick) return;
        const cd = p.customdata as { label?: string; atomIndices?: number[] } | undefined;
        onPeakClick({ label: cd?.label ?? p.text ?? "", atomIndices: cd?.atomIndices });
      }}
      onHover={(evt: { points?: Array<{ customdata?: unknown; text?: string }> }) => {
        const p = evt.points?.[0];
        if (!p || !onPeakHover) return;
        const cd = p.customdata as { label?: string; atomIndices?: number[] } | undefined;
        onPeakHover({ label: cd?.label ?? p.text ?? "", atomIndices: cd?.atomIndices });
      }}
      onUnhover={() => onPeakHover?.(null)}
    />
  );
}

function buildPlot(data: SpectrumData): { plotData: unknown[]; layout: Record<string, unknown> } {
  if (data.kind === "ir") {
    const s = data.spectrum;
    return {
      plotData: [
        {
          x: s.xs,
          y: s.ys,
          mode: "lines",
          line: { color: "#111", width: 1 },
          hovertemplate: "%{x:.0f} cm⁻¹<br>%{y:.1f}% T<extra></extra>",
        },
        // Peak markers with metadata for click/hover
        {
          x: s.bands.map((b) => b.peak),
          y: s.bands.map(() => 0),
          mode: "markers",
          marker: { color: "rgba(0,0,255,0.35)", size: 6 },
          text: s.bands.map((b) => b.label),
          customdata: s.bands.map((b) => ({ label: b.label, atomIndices: b.atomIndices })),
          hovertemplate: "%{text}<br>%{x} cm⁻¹<extra></extra>",
        },
      ],
      layout: {
        margin: { l: 40, r: 20, t: 20, b: 40 },
        xaxis: { title: { text: "wavenumber (cm⁻¹)" }, autorange: "reversed", range: [4000, 400] },
        yaxis: { title: { text: "% transmittance" }, range: [0, 105] },
        showlegend: false,
      },
    };
  }
  if (data.kind === "hnmr") {
    const s = data.spectrum;
    return {
      plotData: [
        {
          x: s.xs,
          y: s.ys,
          mode: "lines",
          line: { color: "#111", width: 1 },
          hoverinfo: "skip",
        },
        {
          x: s.peaks.map((p) => p.shift),
          y: s.peaks.map(() => 0),
          mode: "markers",
          marker: { color: "rgba(220,0,0,0.6)", size: 8 },
          text: s.peaks.map((p) => `${p.integration}H ${p.multiplicity} @ δ${p.shift}`),
          customdata: s.peaks.map((p) => ({
            label: `${p.integration}H ${p.multiplicity} δ${p.shift}${p.note ? ` (${p.note})` : ""}`,
            atomIndices: p.atomIndices,
          })),
          hovertemplate: "%{text}<extra></extra>",
        },
      ],
      layout: {
        margin: { l: 40, r: 20, t: 20, b: 40 },
        xaxis: { title: { text: "δ (ppm)" }, autorange: "reversed", range: [12, 0] },
        yaxis: { title: { text: "intensity" }, showticklabels: false },
        showlegend: false,
      },
    };
  }
  if (data.kind === "cnmr") {
    const s = data.spectrum;
    return {
      plotData: [
        {
          x: s.peaks.map((p) => p.shift),
          y: s.peaks.map((p) => (p.dept135 === 0 ? 0.8 : 1)),
          text: s.peaks.map((p) => `δ${p.shift} · H${p.hCount}`),
          customdata: s.peaks.map((p) => ({
            label: `¹³C δ${p.shift} (${p.hCount} H)`,
            atomIndices: p.atomIndices,
          })),
          type: "bar",
          marker: {
            color: s.peaks.map((p) => {
              if (p.dept135 === -1) return "#0369a1"; // CH2 (down in DEPT-135)
              if (p.dept135 === 1) return "#059669"; // CH/CH3
              return "#525252"; // quaternary
            }),
          },
          hovertemplate: "%{text}<extra></extra>",
        },
      ],
      layout: {
        margin: { l: 40, r: 20, t: 30, b: 40 },
        xaxis: { title: { text: "δ (ppm)" }, autorange: "reversed", range: [220, 0] },
        yaxis: { visible: false, range: [0, 1.2] },
        title: { text: "green: CH/CH₃  ·  blue: CH₂  ·  gray: quaternary", x: 0.02, font: { size: 10 } },
        showlegend: false,
      },
    };
  }
  // ms
  const s = data.spectrum;
  return {
    plotData: [
      {
        x: s.peaks.map((p) => p.mz),
        y: s.peaks.map((p) => p.intensity),
        text: s.peaks.map((p) => `${p.mz}: ${p.label}`),
        customdata: s.peaks.map((p) => ({ label: p.label, atomIndices: p.atomIndices })),
        type: "bar",
        marker: { color: "#111" },
        hovertemplate: "m/z %{x}: %{text}<extra></extra>",
      },
    ],
    layout: {
      margin: { l: 40, r: 20, t: 30, b: 40 },
      xaxis: { title: { text: "m/z" } },
      yaxis: { title: { text: "relative intensity" } },
      title: { text: `formula ${s.formula} · monoisotopic ${s.monoMass}`, x: 0.02, font: { size: 10 } },
      showlegend: false,
    },
  };
}
