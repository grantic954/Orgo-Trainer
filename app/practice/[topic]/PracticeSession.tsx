"use client";

import { useState } from "react";
import { QuestionCard, type AttemptRecord } from "@/components/QuestionCard";
import type { Question } from "@/lib/questions/schema";

export function PracticeSession({ questions }: { questions: Question[] }) {
  const [i, setI] = useState(0);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const q = questions[i];

  function next() {
    setI((n) => (n + 1) % questions.length);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Question {i + 1} of {questions.length}
        </span>
        <span>
          Score: {history.filter((h) => h.verdict === "correct").length} / {history.length}
        </span>
      </div>

      <QuestionCard
        key={q.id}
        question={q}
        onAttempt={(rec) => setHistory((h) => [...h, rec])}
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
