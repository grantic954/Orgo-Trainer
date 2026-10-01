// Server-side helpers that join Chapter metadata with the question bank.
import { loadAllQuestions } from "@/lib/questions/loader";
import { CHAPTERS, chapterByNumber, type Chapter } from "./data";
import type { Question } from "@/lib/questions/schema";

export interface ChapterSummary {
  chapter: Chapter;
  questionCount: number;
}

export function allChapterSummaries(): ChapterSummary[] {
  const all = loadAllQuestions();
  return CHAPTERS.map((chapter) => ({
    chapter,
    questionCount: all.filter((q) => chapter.topics.includes(q.topic)).length,
  }));
}

export function questionsForChapter(num: number): Question[] {
  const ch = chapterByNumber(num);
  if (!ch) return [];
  const all = loadAllQuestions();
  return all.filter((q) => ch.topics.includes(q.topic));
}
