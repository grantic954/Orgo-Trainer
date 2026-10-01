// Dexie-backed storage for attempts and SRS state. Everything is local
// (IndexedDB), per §3 — no backend needed to start.
"use client";

import Dexie, { type EntityTable } from "dexie";
import {
  emptyRecord,
  scheduleNext,
  type SrsCardRecord,
  type SrsVerdict,
} from "@/lib/srs/fsrs";

export type StudyMode = "practice" | "exam" | "drill" | "mistakes";

export interface AttemptRow {
  id?: number;
  questionId: string;
  topic: string;
  verdict: SrsVerdict;
  credit: number;
  submitted: string; // SMILES or option id (stringified)
  trapIds: string[];
  mode: StudyMode;
  timestamp: number; // ms since epoch
  // The question's concept tags at the time, for dashboard aggregates.
  concepts: string[];
}

class OrgoDB extends Dexie {
  attempts!: EntityTable<AttemptRow, "id">;
  srs!: EntityTable<SrsCardRecord, "questionId">;

  constructor() {
    super("orgo2-trainer");
    this.version(1).stores({
      attempts: "++id, questionId, topic, timestamp, verdict, mode",
      srs: "questionId, due, state",
    });
  }
}

let _db: OrgoDB | null = null;
function db(): OrgoDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie is browser-only; guard calls with `typeof window !== 'undefined'`.");
  }
  if (!_db) _db = new OrgoDB();
  return _db;
}

// ---- attempts -----------------------------------------------------------

export async function recordAttempt(row: Omit<AttemptRow, "id" | "timestamp"> & { timestamp?: number }): Promise<void> {
  await db().attempts.add({
    ...row,
    timestamp: row.timestamp ?? Date.now(),
  });
}

export async function listAttempts(limit = 500): Promise<AttemptRow[]> {
  return db().attempts.orderBy("timestamp").reverse().limit(limit).toArray();
}

export async function attemptsByQuestion(questionId: string): Promise<AttemptRow[]> {
  return db().attempts.where({ questionId }).toArray();
}

// ---- SRS ----------------------------------------------------------------

export async function recordAttemptAndSchedule(
  row: Omit<AttemptRow, "id" | "timestamp"> & { timestamp?: number },
): Promise<SrsCardRecord> {
  const now = row.timestamp ?? Date.now();
  await recordAttempt({ ...row, timestamp: now });
  const existing = (await db().srs.get(row.questionId)) ?? emptyRecord(row.questionId, new Date(now));
  const next = scheduleNext(existing, row.verdict, row.credit, new Date(now));
  await db().srs.put(next);
  return next;
}

export async function getSrs(questionId: string): Promise<SrsCardRecord | undefined> {
  return db().srs.get(questionId);
}

export async function listDueQuestionIds(now = new Date()): Promise<string[]> {
  const all = await db().srs.toArray();
  return all.filter((r) => r.due.getTime() <= now.getTime()).map((r) => r.questionId);
}

// ---- dashboard aggregates ----------------------------------------------

export interface Aggregates {
  byTopic: Array<{ key: string; correct: number; total: number; accuracy: number }>;
  byConcept: Array<{ key: string; correct: number; total: number; accuracy: number }>;
  byTrap: Array<{ trap: string; count: number }>;
  recentAttempts: AttemptRow[];
  totalAttempts: number;
  totalCorrect: number;
}

export async function computeAggregates(): Promise<Aggregates> {
  const attempts = await listAttempts(5000);
  const topicMap = new Map<string, { correct: number; total: number }>();
  const conceptMap = new Map<string, { correct: number; total: number }>();
  const trapMap = new Map<string, number>();
  let totalCorrect = 0;

  for (const a of attempts) {
    const isCorrect = a.verdict === "correct";
    if (isCorrect) totalCorrect++;
    bump(topicMap, a.topic, isCorrect);
    for (const c of a.concepts) bump(conceptMap, c, isCorrect);
    for (const t of a.trapIds) trapMap.set(t, (trapMap.get(t) ?? 0) + 1);
  }

  return {
    byTopic: toArrayWithAccuracy(topicMap),
    byConcept: toArrayWithAccuracy(conceptMap),
    byTrap: [...trapMap.entries()]
      .map(([trap, count]) => ({ trap, count }))
      .sort((a, b) => b.count - a.count),
    recentAttempts: attempts.slice(0, 50),
    totalAttempts: attempts.length,
    totalCorrect,
  };
}

function bump(m: Map<string, { correct: number; total: number }>, key: string, correct: boolean) {
  const cur = m.get(key) ?? { correct: 0, total: 0 };
  cur.total++;
  if (correct) cur.correct++;
  m.set(key, cur);
}

function toArrayWithAccuracy(m: Map<string, { correct: number; total: number }>) {
  return [...m.entries()]
    .map(([key, v]) => ({ key, correct: v.correct, total: v.total, accuracy: v.total === 0 ? 0 : v.correct / v.total }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// ---- mistakes & drill filters ------------------------------------------

export async function listRecentlyWrongQuestionIds(limit = 50): Promise<string[]> {
  const attempts = await listAttempts(1000);
  const latestVerdictPerQuestion = new Map<string, SrsVerdict>();
  for (const a of attempts) {
    if (!latestVerdictPerQuestion.has(a.questionId)) {
      latestVerdictPerQuestion.set(a.questionId, a.verdict);
    }
  }
  const wrong = [...latestVerdictPerQuestion.entries()]
    .filter(([, v]) => v !== "correct")
    .map(([id]) => id);
  return wrong.slice(0, limit);
}

export async function clearAll(): Promise<void> {
  await db().attempts.clear();
  await db().srs.clear();
}
