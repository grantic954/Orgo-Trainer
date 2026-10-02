"use client";

import { useState } from "react";
import { QuestionCard, type AttemptRecord } from "@/components/QuestionCard";
import type { Question } from "@/lib/questions/schema";
import { recordAttemptAndSchedule, type StudyMode } from "@/lib/db";

export interface PracticeSessionProps {
  questions: Question[];
  mode?: StudyMode;
  hideHints?: boolean;
  timerSeconds?: number;
}

export function PracticeSession({
  questions,
  mode = "practice",
  timerSeconds,
}: PracticeSessionProps) {
  const [i, setI] = useState(0);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [remaining, setRemaining] = useState<number | null>(timerSeconds ?? null);
  const q = questions[i];

  function next() {
    setI((n) => (n + 1) % questions.length);
  }

  async function handleAttempt(rec: AttemptRecord) {
    setHistory((h) => [...h, rec]);
    // Persist to Dexie — fire and forget; errors land in the console only.
    try {
      await recordAttemptAndSchedule({
        questionId: q.id,
        topic: q.topic,
        verdict: rec.verdict,
        credit: rec.credit,
        submitted:
          typeof rec.submitted === "string" ? rec.submitted : JSON.stringify(rec.submitted),
        trapIds: [],
        mode,
        concepts: q.concepts ?? [],
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[dexie] failed to persist attempt", e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
        <span>
          Question {i + 1} of {questions.length}
          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
            {mode}
          </span>
        </span>
        <div className="flex items-center gap-3">
          <span>
            Score: {history.filter((h) => h.verdict === "correct").length} / {history.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm font-medium hover:bg-neutral-50"
          >
            Next →
          </button>
        </div>
      </div>

      {remaining !== null && (
        <Timer initialSeconds={remaining} onExpire={() => setRemaining(0)} />
      )}

      <QuestionCard
        key={q.id}
        question={q}
        onAttempt={handleAttempt}
        hideHints={mode === "exam"}
      />

      <div>
        <button
          type="button"
          onClick={next}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Next question →
        </button>
      </div>
    </div>
  );
}

function Timer({ initialSeconds, onExpire }: { initialSeconds: number; onExpire: () => void }) {
  const [t, setT] = useState(initialSeconds);
  useEffectOnce(() => {
    const id = setInterval(() => {
      setT((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  });
  const mins = Math.floor(t / 60);
  const secs = String(t % 60).padStart(2, "0");
  return (
    <div className={`rounded border px-3 py-1 text-sm font-mono ${t < 60 ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50"}`}>
      Time remaining: {mins}:{secs}
    </div>
  );
}

function useEffectOnce(fn: () => (() => void) | void) {
  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    // Defer to a microtask so React doesn't warn about state updates during render.
    queueMicrotask(() => {
      fn();
    });
  }
}
