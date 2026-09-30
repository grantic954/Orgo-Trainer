// Phase 4 — Plotly-based spectrum plot with reversed axes and peak hover/click.
// Placeholder scaffold.
"use client";

export interface SpectrumPlotProps {
  kind: "ir" | "hnmr" | "cnmr" | "dept" | "ms";
  data: unknown;
  onPeakClick?: (peakId: string) => void;
}

export function SpectrumPlot(_props: SpectrumPlotProps) {
  return null;
}
