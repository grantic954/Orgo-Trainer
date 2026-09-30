"use client";

import { useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";
import { StructureEditor } from "@/components/StructureEditor";
import { StructureView } from "@/components/StructureView";
import { grade, type GradeResult, type QuestionForGrading } from "@/lib/chem/grade";
import { rdkitCanonicalizer } from "@/lib/chem/canonicalizer";

const QUESTION: QuestionForGrading = {
  id: "phase2-demo-benzoic-acid",
  answers: [{ smiles: "OC(=O)c1ccccc1", label: "benzoic acid" }],
};

const CANONICAL_ANSWER_SMILES = QUESTION.answers[0].smiles;

const VERDICT_STYLES: Record<GradeResult["verdict"], string> = {
  correct: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "partial-stereo": "bg-amber-50 text-amber-800 border-amber-200",
  acceptable: "bg-sky-50 text-sky-800 border-sky-200",
  "starting-material": "bg-orange-50 text-orange-800 border-orange-200",
  wrong: "bg-red-50 text-red-800 border-red-200",
  invalid: "bg-neutral-50 text-neutral-800 border-neutral-300",
};

export function BenzoicAcidDemo() {
  const ketcherRef = useRef<Ketcher | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [lastSmiles, setLastSmiles] = useState<string>("");

  async function handleSubmit() {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    setBusy(true);
    try {
      const smiles = (await ketcher.getSmiles()).trim();
      setLastSmiles(smiles);
      if (!smiles) {
        setResult({
          verdict: "invalid",
          credit: 0,
          message: "The canvas is empty — draw a structure first.",
          diagnostics: ["empty-input"],
        });
        return;
      }
      const canon = rdkitCanonicalizer();
      const r = await grade(smiles, QUESTION, canon);
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setResult(null);
    setLastSmiles("");
    await ketcherRef.current?.setMolecule("");
  }

  return (
    <div className="flex flex-col gap-4">
      <StructureEditor
        onInit={(ketcher) => {
          ketcherRef.current = ketcher;
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy ? "Grading…" : "Submit"}
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          onClick={handleReset}
        >
          Clear
        </button>
      </div>

      {result && (
        <div
          className={`rounded border px-4 py-3 text-sm ${VERDICT_STYLES[result.verdict]}`}
          role="status"
        >
          <div className="font-medium">
            {verdictLabel(result.verdict)} · credit {result.credit.toFixed(2)}
          </div>
          <div className="mt-1">{result.message}</div>
          {result.diagnostics.length > 0 && (
            <div className="mt-2 text-xs font-mono opacity-75">
              diagnostics: {result.diagnostics.join(", ")}
            </div>
          )}
          {lastSmiles && (
            <div className="mt-2 text-xs font-mono opacity-75">
              submitted: {lastSmiles}
            </div>
          )}
        </div>
      )}

      {result && result.verdict !== "correct" && (
        <details className="rounded border border-neutral-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium">Show expected answer</summary>
          <div className="mt-3 flex items-center gap-4">
            <StructureView smiles={CANONICAL_ANSWER_SMILES} width={240} height={160} />
            <div>
              <div className="font-medium">Benzoic acid</div>
              <div className="font-mono text-xs text-neutral-500">
                {CANONICAL_ANSWER_SMILES}
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function verdictLabel(v: GradeResult["verdict"]): string {
  switch (v) {
    case "correct":
      return "Correct";
    case "partial-stereo":
      return "Stereochemistry off";
    case "acceptable":
      return "Accepted alternate";
    case "starting-material":
      return "That's the starting material";
    case "wrong":
      return "Not quite";
    case "invalid":
      return "Invalid structure";
  }
}
