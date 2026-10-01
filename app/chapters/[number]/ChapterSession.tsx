"use client";

import { useMemo, useState } from "react";
import { PracticeSession } from "@/app/practice/[topic]/PracticeSession";
import type { Question } from "@/lib/questions/schema";

type Band = "easy" | "medium" | "hard" | "challenge";
const BANDS: { id: Band; label: string; range: [number, number]; color: string }[] = [
  { id: "easy", label: "Easy", range: [1, 2], color: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { id: "medium", label: "Medium", range: [3, 3], color: "border-sky-200 bg-sky-50 text-sky-800" },
  { id: "hard", label: "Hard", range: [4, 4], color: "border-amber-200 bg-amber-50 text-amber-800" },
  { id: "challenge", label: "Challenge", range: [5, 5], color: "border-red-200 bg-red-50 text-red-800" },
];

function bandOf(difficulty: number): Band {
  if (difficulty <= 2) return "easy";
  if (difficulty === 3) return "medium";
  if (difficulty === 4) return "hard";
  return "challenge";
}

export function ChapterSession({
  questions,
  chapterNumber,
}: {
  questions: Question[];
  chapterNumber: number;
}) {
  const [selected, setSelected] = useState<Set<Band>>(
    new Set<Band>(["easy", "medium", "hard", "challenge"]),
  );

  const countsByBand = useMemo(() => {
    const map = new Map<Band, number>(BANDS.map((b) => [b.id, 0]));
    for (const q of questions) {
      const b = bandOf(q.difficulty);
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    return map;
  }, [questions]);

  const filtered = useMemo(
    () => questions.filter((q) => selected.has(bandOf(q.difficulty))),
    [questions, selected],
  );

  function toggle(band: Band) {
    const next = new Set(selected);
    if (next.has(band)) next.delete(band);
    else next.add(band);
    if (next.size === 0) next.add(band); // never empty
    setSelected(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
        Practice mode — hints and tutor available. Chapter {chapterNumber}.
      </div>

      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Difficulty:
        </span>
        {BANDS.map((b) => {
          const count = countsByBand.get(b.id) ?? 0;
          const isOn = selected.has(b.id);
          const disabled = count === 0;
          return (
            <button
              key={b.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(b.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isOn && !disabled
                  ? b.color
                  : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {b.label} <span className="ml-1 opacity-75">({count})</span>
            </button>
          );
        })}
      </section>

      {filtered.length === 0 ? (
        <p className="rounded border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500">
          No questions match the selected difficulty filters.
        </p>
      ) : (
        <PracticeSession
          key={[...selected].sort().join(",")}
          questions={filtered}
          mode="practice"
        />
      )}
    </div>
  );
}
