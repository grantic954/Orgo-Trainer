// Question schema (Zod) — matches §5 of CLAUDE.md.
// Used by both the runtime UI and the CI validator.
import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "mcq",
  "draw_product",
  "draw_starting_material",
  "reagent_fill",
  "rank",
  "stereo_draw",
  "mechanism",
  "spectrum_id",
  "peak_click",
  "multistep",
  "count",
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

const NonEmptyString = z.string().min(1);

export const AnswerSchema = z.object({
  smiles: NonEmptyString,
  label: z.string().optional(),
  credit: z.number().min(0).max(1).optional(),
});

export const AcceptableSchema = AnswerSchema.extend({
  credit: z.number().min(0).max(1).default(0.5),
});

export const TrapSchema = z.object({
  smiles: NonEmptyString,
  trap: NonEmptyString, // trap id (must resolve against data/traps.json in CI)
  note: z.string().optional(),
});

export const McqOptionSchema = z.object({
  id: NonEmptyString,
  label: z.string().optional(),
  smiles: z.string().optional(),
});

export const BaseQuestionSchema = z.object({
  id: NonEmptyString,
  topic: NonEmptyString,
  type: QuestionTypeSchema,
  difficulty: z.number().int().min(1).max(5),
  prompt: NonEmptyString,
  concepts: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  source: z.string().default("authored"),
  reactants: z.array(NonEmptyString).default([]),
  reagents: z.array(z.string()).default([]),
  ignoreStereo: z.boolean().default(false),
  expectsRearrangement: z.boolean().default(false),
});

export const StructureQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum([
    "draw_product",
    "draw_starting_material",
    "stereo_draw",
    "spectrum_id",
    "multistep",
  ]),
  answers: z.array(AnswerSchema).min(1),
  acceptable: z.array(AcceptableSchema).default([]),
  traps: z.array(TrapSchema).default([]),
});

export const McqQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("mcq"),
  options: z.array(McqOptionSchema).min(2),
  correctOptionId: NonEmptyString,
});

export const RankQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("rank"),
  items: z.array(z.object({ id: NonEmptyString, label: NonEmptyString })).min(2),
  correctOrder: z.array(NonEmptyString).min(2),
});

export const ReagentFillQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("reagent_fill"),
  reagentChoices: z.array(z.object({ id: NonEmptyString, label: NonEmptyString })).min(2),
  correctReagentIds: z.array(NonEmptyString).min(1),
});

export const CountQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("count"),
  answer: z.number().int().min(0),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  StructureQuestionSchema.extend({ type: z.literal("draw_product") }),
  StructureQuestionSchema.extend({ type: z.literal("draw_starting_material") }),
  StructureQuestionSchema.extend({ type: z.literal("stereo_draw") }),
  StructureQuestionSchema.extend({ type: z.literal("spectrum_id") }),
  StructureQuestionSchema.extend({ type: z.literal("multistep") }),
  McqQuestionSchema,
  RankQuestionSchema,
  ReagentFillQuestionSchema,
  CountQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type StructureQuestion = z.infer<typeof StructureQuestionSchema>;
export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type RankQuestion = z.infer<typeof RankQuestionSchema>;
export type ReagentFillQuestion = z.infer<typeof ReagentFillQuestionSchema>;
export type CountQuestion = z.infer<typeof CountQuestionSchema>;

export function isStructureQuestion(q: Question): q is StructureQuestion {
  return (
    q.type === "draw_product" ||
    q.type === "draw_starting_material" ||
    q.type === "stereo_draw" ||
    q.type === "spectrum_id" ||
    q.type === "multistep"
  );
}
