"use client";

import { useState } from "react";
import { MolText } from "@/components/MolText";
import type { TutorAction, TutorRequest } from "@/lib/tutor/types";

export interface HintPanelProps {
  question: TutorRequest["question"];
  attempt: TutorRequest["attempt"];
}

const HINT_BUTTONS: Array<{ id: 1 | 2 | 3 | 4; label: string; hint: string }> = [
  { id: 1, label: "Concept", hint: "Level 1 — name the concept at play" },
  { id: 2, label: "Where", hint: "Level 2 — point at the atom/group" },
  { id: 3, label: "Mechanism", hint: "Level 3 — walk the arrows" },
  { id: 4, label: "Solution", hint: "Level 4 — full answer" },
];

export function HintPanel({ question, attempt }: HintPanelProps) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<TutorAction | null>(null);

  async function run(action: TutorAction) {
    setBusy(true);
    setError(null);
    setText("");
    setLastAction(action);
    try {
      const body: TutorRequest = { action, question, attempt, history: [] };
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `tutor request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI tutor</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
          hint ladder
        </span>
      </header>

      <div className="flex flex-wrap gap-2">
        {HINT_BUTTONS.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => run({ kind: "hint", level: b.id })}
            title={b.hint}
            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
          >
            {b.id}. {b.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !attempt}
          onClick={() => run({ kind: "why-wrong" })}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Why is my answer wrong?
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run({ kind: "explain-mechanism" })}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Explain the mechanism
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run({ kind: "similar-problem" })}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50"
        >
          Show a similar problem
        </button>
      </div>

      {(text || busy || error) && (
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          {lastAction && (
            <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">
              {actionLabel(lastAction)}
            </div>
          )}
          {error ? (
            <div className="text-sm text-red-700">Tutor error: {error}</div>
          ) : text ? (
            <MolText text={text} />
          ) : (
            <div className="text-sm text-neutral-500">Thinking…</div>
          )}
        </div>
      )}
    </section>
  );
}

function actionLabel(a: TutorAction): string {
  switch (a.kind) {
    case "hint":
      return `Level ${a.level} hint`;
    case "why-wrong":
      return "Why is my answer wrong?";
    case "explain-mechanism":
      return "Mechanism";
    case "similar-problem":
      return "Similar problem";
    case "free":
      return "Chat";
  }
}
