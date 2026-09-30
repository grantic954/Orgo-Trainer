export type TutorAction =
  | { kind: "hint"; level: 1 | 2 | 3 | 4 }
  | { kind: "why-wrong" }
  | { kind: "explain-mechanism" }
  | { kind: "similar-problem" }
  | { kind: "free"; text: string };

export interface TutorRequest {
  action: TutorAction;
  question: {
    id: string;
    prompt: string;
    type: string;
    reactants: string[];
    reagents: string[];
    correctAnswers: Array<{ smiles: string; label?: string }>;
    concepts: string[];
    explanation?: string;
  };
  attempt: {
    smiles: string;
    verdict: string;
    credit: number;
    diagnostics: string[];
  } | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}
