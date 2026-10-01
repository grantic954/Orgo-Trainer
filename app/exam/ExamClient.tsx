"use client";

import { useMemo, useState } from "react";
import { PracticeSession } from "@/app/practice/[topic]/PracticeSession";
import type { Question } from "@/lib/questions/schema";

export function ExamClient({
  allQuestions,
  topics,
}: {
  allQuestions: Question[];
  topics: string[];
}) {
  const [chosenTopics, setChosenTopics] = useState<Set<string>>(new Set(topics));
  const [n, setN] = useState(10);
  const [minutes, setMinutes] = useState(15);
  const [started, setStarted] = useState(false);

  const selected = useMemo(() => {
    const pool = allQuestions.filter((q) => chosenTopics.has(q.topic));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }, [allQuestions, chosenTopics, n, started]);  // re-shuffle on start

  function toggle(topic: string) {
    const next = new Set(chosenTopics);
    if (next.has(topic)) next.delete(topic);
    else next.add(topic);
    setChosenTopics(next);
  }

  if (started) {
    if (selected.length === 0) {
      return <div className="text-sm text-neutral-500">No questions in the chosen topics.</div>;
    }
    return (
      <PracticeSession
        questions={selected}
        mode="exam"
        timerSeconds={minutes * 60}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 bg-white p-5">
      <section>
        <h2 className="text-sm font-semibold">Topics</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                chosenTopics.has(t)
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Questions</span>
          <input
            type="number"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="rounded border border-neutral-200 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Minutes</span>
          <input
            type="number"
            min={1}
            max={120}
            value={minutes}
            onChange={(e) =>
              setMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 1)))
            }
            className="rounded border border-neutral-200 px-2 py-1"
          />
        </label>
      </section>

      <button
        type="button"
        onClick={() => setStarted(true)}
        disabled={chosenTopics.size === 0}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Start exam
      </button>
    </div>
  );
}
