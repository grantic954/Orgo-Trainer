"use client";

import dynamic from "next/dynamic";

const SpectrumPlotInner = dynamic(() => import("./SpectrumPlotInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] w-full items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
      Loading plot…
    </div>
  ),
});

export { SpectrumPlotInner as _SpectrumPlotInner };
export const SpectrumPlot = SpectrumPlotInner;
export type { SpectrumPlotInnerProps as SpectrumPlotProps, SpectrumKind } from "./SpectrumPlotInner";
