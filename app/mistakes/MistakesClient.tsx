"use client";

import { useEffect, useState } from "react";
import { PracticeSession } from "@/app/practice/[topic]/PracticeSession";
import { listRecentlyWrongQuestionIds } from "@/lib/db";
import type { Question } from "@/lib/questions/schema";

export function MistakesClient({ allQuestions }: { allQuestions: Question[] }) {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    listRecentlyWrongQuestionIds().then(setIds);
  }, []);

  if (ids === null) return <div className="text-sm text-neutral-500">Loading…</div>;

  const questions = ids
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is Question => !!q);

  if (questions.length === 0) {
    return (
      <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
        No mistakes to review yet — attempt some questions in{" "}
        <a href="/practice" className="font-medium text-blue-600 hover:underline">Practice</a>.
      </div>
    );
  }

  return <PracticeSession questions={questions} mode="mistakes" />;
}
