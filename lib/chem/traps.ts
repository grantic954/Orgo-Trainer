// Phase 3 — trap detector (per-question + generic rules).
export interface TrapHit {
  id: string;
  source: "per-question" | "generic";
  note?: string;
}

export function detectTraps(_userSmiles: string, _questionId: string): TrapHit[] {
  return [];
}
