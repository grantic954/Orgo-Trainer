// The actual Ketcher editor. Loaded via dynamic import from `StructureEditor`
// so the ~1.5 MB bundle stays off the home page.
"use client";

import "ketcher-react/dist/index.css";

import { useEffect, useMemo } from "react";
import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import type { Ketcher } from "ketcher-core";

export interface StructureEditorInnerProps {
  onInit?: (ketcher: Ketcher) => void;
  onChange?: (payload: { smiles: string; molfile: string }) => void;
  initialSmiles?: string;
}

export default function StructureEditorInner({
  onInit,
  onChange,
  initialSmiles,
}: StructureEditorInnerProps) {
  const provider = useMemo(() => new StandaloneStructServiceProvider(), []);

  useEffect(() => {
    // Cleanup any leaked global reference on unmount.
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ketcher = undefined;
    };
  }, []);

  return (
    <div className="h-[520px] w-full overflow-hidden rounded border border-neutral-200 bg-white">
      <Editor
        staticResourcesUrl=""
        structServiceProvider={provider}
        errorHandler={(msg: string) => {
          // eslint-disable-next-line no-console
          console.error("[ketcher]", msg);
        }}
        onInit={async (ketcher: Ketcher) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).ketcher = ketcher;
          onInit?.(ketcher);

          if (initialSmiles) {
            try {
              await ketcher.setMolecule(initialSmiles);
            } catch {
              // ignore — bad seed shouldn't crash the editor
            }
          }

          if (onChange) {
            // Ketcher fires "change" on any structure edit.
            ketcher.editor.subscribe("change", async () => {
              try {
                const [smiles, molfile] = await Promise.all([
                  ketcher.getSmiles(),
                  ketcher.getMolfile(),
                ]);
                onChange({ smiles, molfile });
              } catch {
                // structure not readable yet
              }
            });
          }
        }}
      />
    </div>
  );
}
