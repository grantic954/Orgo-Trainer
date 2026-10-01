// Public wrapper: renders our custom KetcherToolbar above the dynamic-imported
// Ketcher canvas. Ketcher's own chrome is hidden via ketcher-overrides.css.
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Ketcher } from "ketcher-core";
import { KetcherToolbar } from "./KetcherToolbar";
import { ALL_TOOLS } from "@/lib/ketcher/allowlist";
import type { ToolId } from "@/lib/ketcher/tools";

const StructureEditorInner = dynamic(() => import("./StructureEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
      Loading editor…
    </div>
  ),
});

export interface StructureEditorProps {
  onInit?: (ketcher: Ketcher) => void;
  onChange?: (payload: { smiles: string; molfile: string }) => void;
  initialSmiles?: string;
  /** Tool allow-list; defaults to the full set (used by /sandbox). */
  tools?: Set<ToolId>;
  /** Hide the toolbar entirely (e.g., when a question doesn't need drawing). */
  hideToolbar?: boolean;
}

export function StructureEditor({
  onInit,
  onChange,
  initialSmiles,
  tools = ALL_TOOLS,
  hideToolbar = false,
}: StructureEditorProps) {
  const [ketcher, setKetcher] = useState<Ketcher | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {!hideToolbar && <KetcherToolbar ketcher={ketcher} allow={tools} />}
      <StructureEditorInner
        initialSmiles={initialSmiles}
        onChange={onChange}
        onInit={(k) => {
          setKetcher(k);
          onInit?.(k);
        }}
      />
      {!hideToolbar && (
        <p className="text-xs text-neutral-500">
          Drag on the canvas to draw. Hold{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">Space</kbd> + drag to pan ·{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">⌘/Ctrl+A</kbd> select all ·{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">⌘/Ctrl+C/V</kbd> copy/paste ·{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">⌘/Ctrl+Z</kbd> undo
        </p>
      )}
    </div>
  );
}
