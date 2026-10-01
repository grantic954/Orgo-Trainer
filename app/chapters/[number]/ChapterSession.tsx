"use client";

import { PracticeSession } from "@/app/practice/[topic]/PracticeSession";
import type { Question } from "@/lib/questions/schema";

export function ChapterSession({
  questions,
  chapterNumber,
}: {
  questions: Question[];
  chapterNumber: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
        Practice mode — hints and tutor available. Questions scoped to Chapter {chapterNumber}.
      </div>
      <PracticeSession questions={questions} mode="practice" />
    </div>
  );
}
