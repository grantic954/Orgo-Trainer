// Renders any SMILES as a skeletal SVG via RDKit.js. Browser-only (WASM).
"use client";

import { useEffect, useRef, useState } from "react";
import { getRDKit } from "@/lib/chem/rdkit";

export interface StructureViewProps {
  smiles: string;
  width?: number;
  height?: number;
  highlightAtoms?: number[];
  highlightBonds?: number[];
  className?: string;
  title?: string;
}

interface State {
  svg: string | null;
  error: string | null;
}

export function StructureView({
  smiles,
  width = 260,
  height = 180,
  highlightAtoms,
  highlightBonds,
  className,
  title,
}: StructureViewProps) {
  const [{ svg, error }, setState] = useState<State>({ svg: null, error: null });
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setState({ svg: null, error: null });

    (async () => {
      try {
        const rdkit = await getRDKit();
        const mol = rdkit.get_mol(smiles);
        if (!mol || !mol.is_valid()) {
          mol?.delete();
          if (!cancelled.current) setState({ svg: null, error: "invalid structure" });
          return;
        }
        try {
          const useHighlights =
            (highlightAtoms && highlightAtoms.length > 0) ||
            (highlightBonds && highlightBonds.length > 0);
          const raw = useHighlights
            ? mol.get_svg_with_highlights(
                JSON.stringify({
                  width,
                  height,
                  atoms: highlightAtoms ?? [],
                  bonds: highlightBonds ?? [],
                }),
              )
            : mol.get_svg(width, height);
          if (!cancelled.current) setState({ svg: raw, error: null });
        } finally {
          mol.delete();
        }
      } catch (err) {
        if (!cancelled.current) {
          setState({ svg: null, error: err instanceof Error ? err.message : String(err) });
        }
      }
    })();

    return () => {
      cancelled.current = true;
    };
  }, [smiles, width, height, highlightAtoms, highlightBonds]);

  if (error) {
    return (
      <div
        className={className}
        style={{ width, height }}
        role="img"
        aria-label={`invalid structure: ${smiles}`}
      >
        <div className="flex h-full w-full items-center justify-center rounded border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={className}
        style={{ width, height }}
        role="img"
        aria-label={`loading structure: ${smiles}`}
      >
        <div className="flex h-full w-full items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
          loading…
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width, height }}
      role="img"
      aria-label={title ?? smiles}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
