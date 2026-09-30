// Public wrapper: dynamic-imports the heavy Ketcher bundle client-side only.
"use client";

import dynamic from "next/dynamic";
import type { Ketcher } from "ketcher-core";

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
}

export function StructureEditor(props: StructureEditorProps) {
  return <StructureEditorInner {...props} />;
}
