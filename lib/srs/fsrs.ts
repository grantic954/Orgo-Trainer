// Thin wrapper over ts-fsrs that maps our grader verdicts to FSRS ratings
// and exposes a serializable card shape for Dexie.
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";

export type SrsVerdict =
  | "correct"
  | "partial-stereo"
  | "acceptable"
  | "starting-material"
  | "wrong"
  | "invalid";

export interface SrsCardRecord {
  questionId: string;
  due: Date;
  stability: number;
  difficulty: number;
  state: State;
  lastReview?: Date;
  reps: number;
  lapses: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
}

export function toRecord(card: Card, questionId: string): SrsCardRecord {
  return {
    questionId,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state,
    lastReview: card.last_review,
    reps: card.reps,
    lapses: card.lapses,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
  };
}

export function fromRecord(rec: SrsCardRecord): Card {
  return {
    due: rec.due,
    stability: rec.stability,
    difficulty: rec.difficulty,
    state: rec.state,
    last_review: rec.lastReview,
    reps: rec.reps,
    lapses: rec.lapses,
    elapsed_days: rec.elapsedDays,
    scheduled_days: rec.scheduledDays,
    learning_steps: rec.learningSteps,
  };
}

export function emptyRecord(questionId: string, now = new Date()): SrsCardRecord {
  return toRecord(createEmptyCard(now), questionId);
}

export function verdictToRating(verdict: SrsVerdict, credit: number): Grade {
  switch (verdict) {
    case "correct":
      return credit >= 0.95 ? Rating.Good : Rating.Hard;
    case "acceptable":
      return Rating.Hard;
    case "partial-stereo":
      return Rating.Hard;
    case "starting-material":
    case "wrong":
    case "invalid":
      return Rating.Again;
  }
}

const scheduler = fsrs();

export function scheduleNext(
  prev: SrsCardRecord,
  verdict: SrsVerdict,
  credit: number,
  now = new Date(),
): SrsCardRecord {
  const card = fromRecord(prev);
  const rating = verdictToRating(verdict, credit);
  const next = scheduler.next(card, now, rating);
  return toRecord(next.card, prev.questionId);
}

export function isDue(rec: SrsCardRecord, now = new Date()): boolean {
  return rec.due.getTime() <= now.getTime();
}

export { Rating, State };
