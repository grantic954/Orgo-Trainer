// Server-side question loader: reads data/questions/*.json, validates with the
// Zod schema, and returns typed Question[] for pages to consume.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { QuestionSchema, type Question } from "./schema";

const QUESTIONS_DIR = join(process.cwd(), "data", "questions");

export function loadAllQuestions(): Question[] {
  const files = readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".json")).sort();
  const out: Question[] = [];
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(QUESTIONS_DIR, f), "utf-8"));
    out.push(QuestionSchema.parse(raw));
  }
  return out;
}

export function loadQuestionsByTopic(topic: string): Question[] {
  return loadAllQuestions().filter((q) => q.topic === topic);
}

export function loadQuestion(id: string): Question | null {
  return loadAllQuestions().find((q) => q.id === id) ?? null;
}
