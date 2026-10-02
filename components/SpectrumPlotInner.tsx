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
  hideMarkers?: boolean;
}

export default function SpectrumPlotInner({ data, onPeakClick, onPeakHover, hideMarkers }: SpectrumPlotInnerProps) {
  const { plotData, layout } = useMemo(() => buildPlot(data, { hideMarkers }), [data, hideMarkers]);
  return (
    <Plot
      data={plotData as unknown as never}
      layout={layout as unknown as never}
      config={{ displayModeBar: false, responsive: true } as unknown as never}
      useResizeHandler
      style={{ width: "100%", height: "380px" }}
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

const SHARED_LAYOUT = {
  paper_bgcolor: "white",
  plot_bgcolor: "white",
  font: { family: "ui-sans-serif, system-ui, sans-serif", size: 12, color: "#111" },
  showlegend: false,
  hoverlabel: { bgcolor: "#111", font: { color: "#fff", size: 12 } },
};

function buildPlot(
  data: SpectrumData,
  opts: { hideMarkers?: boolean } = {},
): { plotData: unknown[]; layout: Record<string, unknown> } {
  if (data.kind === "ir") {
    const s = data.spectrum;
    const traces: unknown[] = [
      {
        x: s.xs,
        y: s.ys,
        mode: "lines",
        line: { color: "#111", width: 1.2 },
        hovertemplate: "%{x:.0f} cm⁻¹ · %{y:.0f}% T<extra></extra>",
      },
    ];
    if (!opts.hideMarkers) {
      traces.push({
        x: s.bands.map((b) => b.peak),
        y: s.bands.map(() => 4),
        mode: "markers",
        marker: { color: "rgba(37,99,235,0.55)", size: 7 },
        text: s.bands.map((b) => b.label),
        customdata: s.bands.map((b) => ({ label: b.label, atomIndices: b.atomIndices })),
        hovertemplate: "%{text}<br>%{x} cm⁻¹<extra></extra>",
      });
    }
    return {
      plotData: traces,
      layout: {
        ...SHARED_LAYOUT,
        margin: { l: 55, r: 20, t: 12, b: 48 },
        xaxis: {
          title: { text: "wavenumber (cm⁻¹)", standoff: 8 },
          autorange: "reversed",
          range: [4000, 400],
          gridcolor: "#f1f5f9",
          zeroline: false,
        },
        yaxis: {
          title: { text: "% transmittance", standoff: 8 },
          range: [-2, 105],
          gridcolor: "#f1f5f9",
          zeroline: false,
        },
      },
    };
  }
  if (data.kind === "hnmr") {
    const s = data.spectrum;
    const yMax = Math.max(1, ...s.ys) * 1.1;
    const traces: unknown[] = [
      {
        x: s.xs,
        y: s.ys,
        mode: "lines",
        line: { color: "#111", width: 1.2 },
        hoverinfo: "skip",
      },
    ];
    if (!opts.hideMarkers) {
      traces.push({
        x: s.peaks.map((p) => p.shift),
        y: s.peaks.map(() => yMax * 0.02),
        mode: "markers",
        marker: { color: "rgba(220,38,38,0.7)", size: 8 },
        text: s.peaks.map((p) => `${p.integration}H ${p.multiplicity} @ δ${p.shift}`),
        customdata: s.peaks.map((p) => ({
          label: `${p.integration}H ${p.multiplicity} δ${p.shift}${p.note ? ` (${p.note})` : ""}`,
          atomIndices: p.atomIndices,
        })),
        hovertemplate: "%{text}<extra></extra>",
      });
    }
    return {
      plotData: traces,
      layout: {
        ...SHARED_LAYOUT,
        margin: { l: 55, r: 20, t: 12, b: 48 },
        xaxis: {
          title: { text: "δ (ppm)", standoff: 8 },
          autorange: "reversed",
          range: [12, 0],
          gridcolor: "#f1f5f9",
          zeroline: false,
        },
        yaxis: {
          title: { text: "intensity", standoff: 8 },
          range: [0, yMax],
          showticklabels: false,
          gridcolor: "#f1f5f9",
          zeroline: false,
        },
      },
    };
  }
  if (data.kind === "cnmr") {
    const s = data.spectrum;
    return {
      plotData: [
        {
          x: s.peaks.map((p) => p.shift),
          y: s.peaks.map(() => 1),
          text: s.peaks.map((p) => `δ${p.shift} · ${p.hCount}H`),
          customdata: s.peaks.map((p) => ({
            label: `¹³C δ${p.shift} (${p.hCount} H)`,
            atomIndices: p.atomIndices,
          })),
          type: "bar",
          width: 1.8,
          marker: {
            color: s.peaks.map((p) => {
              if (p.dept135 === -1) return "#0369a1";
              if (p.dept135 === 1) return "#059669";
              return "#525252";
            }),
          },
          hovertemplate: "%{text}<extra></extra>",
        },
      ],
      layout: {
        ...SHARED_LAYOUT,
        margin: { l: 55, r: 20, t: 34, b: 48 },
        xaxis: {
          title: { text: "δ (ppm)", standoff: 8 },
          autorange: "reversed",
          range: [220, 0],
          gridcolor: "#f1f5f9",
          zeroline: false,
        },
        yaxis: { visible: false, range: [0, 1.15] },
        annotations: [
          {
            text: "green: CH/CH₃ · blue: CH₂ · gray: quaternary",
            showarrow: false,
            x: 0.98,
            y: 1.05,
            xref: "paper",
            yref: "paper",
            font: { size: 10, color: "#6b7280" },
            align: "right",
            xanchor: "right",
          },
        ],
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
        width: 0.9,
        marker: { color: "#111" },
        hovertemplate: "m/z %{x}: %{text}<extra></extra>",
      },
    ],
    layout: {
      ...SHARED_LAYOUT,
      margin: { l: 55, r: 20, t: 34, b: 48 },
      xaxis: {
        title: { text: "m/z", standoff: 8 },
        gridcolor: "#f1f5f9",
        zeroline: false,
      },
      yaxis: {
        title: { text: "relative intensity", standoff: 8 },
        range: [0, 110],
        gridcolor: "#f1f5f9",
        zeroline: false,
      },
      annotations: [
        {
          text: `formula ${s.formula} · monoisotopic ${s.monoMass}`,
          showarrow: false,
          x: 0.98,
          y: 1.05,
          xref: "paper",
          yref: "paper",
          font: { size: 10, color: "#6b7280" },
          align: "right",
          xanchor: "right",
        },
      ],
    },
  };
}
