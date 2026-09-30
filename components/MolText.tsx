// Renders a mixed text + <mol>SMILES</mol> stream from the tutor. Each
// <mol> tag becomes an inline StructureView; StructureView drops invalid
// SMILES on its own (RDKit fails → shows an "invalid structure" pill),
// which satisfies §2 rule 3 (LLM SMILES are validated before use).
"use client";

import { Fragment } from "react";
import { StructureView } from "@/components/StructureView";

const MOL_TAG_RE = /<mol>([\s\S]*?)<\/mol>/g;

export function MolText({ text }: { text: string }) {
  const parts: Array<{ kind: "text"; value: string } | { kind: "mol"; value: string }> = [];
  let last = 0;
  for (const m of text.matchAll(MOL_TAG_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ kind: "text", value: text.slice(last, start) });
    parts.push({ kind: "mol", value: m[1].trim() });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  // If we ended in a partial "<mol...>" (streaming, tag not closed yet),
  // strip the fragment so we don't render "<mol>c1cc" as text.
  const trailingOpen = /<mol>[^<]*$/;
  if (parts.length && parts[parts.length - 1].kind === "text") {
    const last = parts[parts.length - 1] as { kind: "text"; value: string };
    last.value = last.value.replace(trailingOpen, "");
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((p, i) => {
        if (p.kind === "text") return <Fragment key={i}>{p.value}</Fragment>;
        return (
          <span key={i} className="inline-block align-middle mx-1 my-1">
            <StructureView smiles={p.value} width={160} height={110} />
          </span>
        );
      })}
    </div>
  );
}
