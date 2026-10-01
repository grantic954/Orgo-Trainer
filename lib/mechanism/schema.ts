// Mechanism data model.
//
// A Mechanism is a list of Steps. Each Step shows a Structure (SMILES)
// with atoms numbered 0..N-1 (RDKit atom index order), and expects the
// student to place one or more curved arrows connecting source → sink
// atoms. The grader compares the submitted arrow list against the
// expected list (order-independent).

import { z } from "zod";

export const ArrowSchema = z.object({
  // Source: either a bond (two atom indices) or a lone pair (one atom index).
  sourceAtom: z.number().int().min(0),
  sourceAtom2: z.number().int().min(0).optional(), // when source is a bond, the other end
  // Sink: an atom index (where the arrow head points).
  sinkAtom: z.number().int().min(0),
  label: z.string().optional(),
});

export type Arrow = z.infer<typeof ArrowSchema>;

export const StepSchema = z.object({
  prompt: z.string(),
  smiles: z.string().min(1),
  expectedArrows: z.array(ArrowSchema).min(1),
  productSmiles: z.string().optional(),
  explanation: z.string().optional(),
});

export type Step = z.infer<typeof StepSchema>;

export const MechanismSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(StepSchema).min(1),
});

export type Mechanism = z.infer<typeof MechanismSchema>;

export function arrowsEqual(a: Arrow, b: Arrow): boolean {
  if (a.sinkAtom !== b.sinkAtom) return false;
  const aSrc = new Set([a.sourceAtom, a.sourceAtom2].filter((n) => n !== undefined));
  const bSrc = new Set([b.sourceAtom, b.sourceAtom2].filter((n) => n !== undefined));
  if (aSrc.size !== bSrc.size) return false;
  for (const x of aSrc) if (!bSrc.has(x)) return false;
  return true;
}

export function gradeArrows(expected: Arrow[], submitted: Arrow[]): {
  correct: boolean;
  matched: number;
  missing: Arrow[];
  extra: Arrow[];
} {
  const matched: Arrow[] = [];
  const missing: Arrow[] = [...expected];
  const extra: Arrow[] = [];
  for (const s of submitted) {
    const idx = missing.findIndex((e) => arrowsEqual(e, s));
    if (idx >= 0) {
      matched.push(missing.splice(idx, 1)[0]);
    } else {
      extra.push(s);
    }
  }
  return {
    correct: missing.length === 0 && extra.length === 0,
    matched: matched.length,
    missing,
    extra,
  };
}
