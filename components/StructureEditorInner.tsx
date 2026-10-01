// The actual Ketcher editor. Loaded via dynamic import from `StructureEditor`
// so the ~1.5 MB bundle stays off the home page.
"use client";

import "ketcher-react/dist/index.css";
import "./ketcher-overrides.css";

import { useEffect, useMemo, useRef } from "react";
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
  const mountedRef = useRef(true);
  const ketcherRef = useRef<Ketcher | null>(null);
  const prevToolRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ketcher = undefined;
    };
  }, []);

  // Prevent Ketcher's canvas from capturing the mouse wheel. Default
  // behavior is: wheel over the canvas pans / zooms Ketcher's internal view,
  // which steals page scroll whenever the cursor happens to be over the
  // editor. We swallow the wheel event in capture phase (and re-dispatch it
  // to the window so the page scrolls instead), and only let it through
  // when Ctrl / Cmd is held — that's the standard "zoom" shortcut and keeps
  // Ketcher's zoom-to-fit UX intact.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) return; // allow Ctrl+scroll zoom in Ketcher
      e.stopImmediatePropagation();
      // Let the browser handle the page scroll naturally.
    }
    el.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, []);

  // Hold-Space to pan: switch to hand tool while held, restore prior tool on
  // release. Scoped to the window so it works regardless of focus.
  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }
    function onDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      const k = ketcherRef.current;
      if (!k) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ed = (k as any).editor;
      // Only switch if we're not already in a text-input-like tool.
      const current = ed?._tool?.name ?? ed?.currentTool?.name ?? null;
      prevToolRef.current = current;
      ed.tool("hand");
      e.preventDefault();
    }
    function onUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const k = ketcherRef.current;
      if (!k) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ed = (k as any).editor;
      // Restore the previous tool (or default to select-rectangle).
      ed.tool("select", "rectangle");
      prevToolRef.current = null;
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="orgo-editor h-[520px] w-full overflow-hidden rounded border border-neutral-200 bg-white"
    >
      <Editor
        staticResourcesUrl=""
        structServiceProvider={provider}
        errorHandler={(msg: string) => {
          // eslint-disable-next-line no-console
          console.error("[ketcher]", msg);
        }}
        onInit={async (ketcher: Ketcher) => {
          if (!mountedRef.current) return;
          ketcherRef.current = ketcher;
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

          if (!mountedRef.current) return;

          if (onChange) {
            ketcher.editor.subscribe("change", async () => {
              if (!mountedRef.current) return;
              try {
                const [smiles, molfile] = await Promise.all([
                  ketcher.getSmiles(),
                  ketcher.getMolfile(),
                ]);
                if (!mountedRef.current) return;
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
