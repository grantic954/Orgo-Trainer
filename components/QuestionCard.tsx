"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Ketcher } from "ketcher-core";
import { StructureEditor } from "@/components/StructureEditor";
import { StructureView } from "@/components/StructureView";
import { SpectrumPanel } from "@/components/SpectrumPanel";
import { HintPanel } from "@/components/HintPanel";
import { TutorChat } from "@/components/TutorChat";
import {
  grade,
  type GradeResult,
  type QuestionForGrading,
} from "@/lib/chem/grade";
import { rdkitCanonicalizer } from "@/lib/chem/canonicalizer";
import { toolsForQuestionType } from "@/lib/ketcher/allowlist";
import type { TutorRequest } from "@/lib/tutor/types";
import type {
  Question,
  McqQuestion,
  RankQuestion,
  ReagentFillQuestion,
  StructureQuestion,
} from "@/lib/questions/schema";

export interface AttemptRecord {
  questionId: string;
  verdict: GradeResult["verdict"];
  credit: number;
  submitted: unknown;
}

export interface QuestionCardProps {
  question: Question;
  onAttempt?: (record: AttemptRecord) => void;
  hideHints?: boolean;
}

// ---- Submit button context -----------------------------------------------
// Lets each body register its submit handler and canSubmit state. The
// top-right Submit button in the header reads from this and triggers it.

interface SubmitSlot {
  submit: () => void | Promise<void>;
  canSubmit: boolean;
  label?: string;
}

const SubmitContext = createContext<(slot: SubmitSlot | null) => void>(
  () => {},
);

function useRegisterSubmit(slot: SubmitSlot) {
  const register = useContext(SubmitContext);
  const slotRef = useRef(slot);
  slotRef.current = slot;
  useEffect(() => {
    register({
      submit: () => slotRef.current.submit(),
      canSubmit: slot.canSubmit,
      label: slot.label,
    });
    return () => register(null);
  }, [register, slot.canSubmit, slot.label]);
}

// ---- Main card -----------------------------------------------------------

export function QuestionCard(props: QuestionCardProps) {
  const { question } = props;
  const [slot, setSlot] = useState<SubmitSlot | null>(null);
  const [latestAttempt, setLatestAttempt] = useState<AttemptRecord | null>(null);
  const [latestDrawDiagnostics, setLatestDrawDiagnostics] = useState<string[]>(
    [],
  );
  const [latestSmiles, setLatestSmiles] = useState<string>("");

  const handleAttempt = useCallback(
    (rec: AttemptRecord) => {
      setLatestAttempt(rec);
      props.onAttempt?.(rec);
    },
    [props],
  );

  return (
    <SubmitContext.Provider value={setSlot}>
      <article className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{question.prompt}</h2>
            <div className="mt-0.5 text-xs text-neutral-500">
              {question.topic} · difficulty {question.difficulty} ·{" "}
              {question.type}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {question.reagents.length > 0 && (
              <div className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
                reagents: {question.reagents.join(", ")}
              </div>
            )}
            {slot && (
              <button
                type="button"
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                disabled={!slot.canSubmit}
                onClick={() => slot.submit()}
              >
                {slot.label ?? "Submit"}
              </button>
            )}
          </div>
        </header>

        {question.reactants.length > 0 && (
          <section className="flex flex-wrap gap-3">
            {question.reactants.map((s, i) => (
              <StructureView
                key={i}
                smiles={s}
                width={180}
                height={120}
                title={`reactant ${i + 1}`}
              />
            ))}
          </section>
        )}

        {question.spectrumFromSmiles &&
          question.spectraKinds &&
          question.spectraKinds.length > 0 && (
            <SpectrumPanel
              smiles={question.spectrumFromSmiles}
              kinds={question.spectraKinds}
            />
          )}

        {question.type === "mcq" && (
          <McqBody
            question={question}
            onAttempt={handleAttempt}
          />
        )}
        {question.type === "rank" && (
          <RankBody
            question={question}
            onAttempt={handleAttempt}
          />
        )}
        {question.type === "reagent_fill" && (
          <ReagentFillBody
            question={question}
            onAttempt={handleAttempt}
          />
        )}
        {(question.type === "draw_product" ||
          question.type === "draw_starting_material" ||
          question.type === "stereo_draw" ||
          question.type === "spectrum_id" ||
          question.type === "multistep") && (
          <DrawBody
            question={question as StructureQuestion}
            onAttempt={handleAttempt}
            onDiagnostics={(d, s) => {
              setLatestDrawDiagnostics(d);
              setLatestSmiles(s);
            }}
          />
        )}

        {!props.hideHints && (
          <>
            <HintPanel
              question={tutorQuestion(question)}
              attempt={tutorAttempt(
                latestAttempt,
                latestDrawDiagnostics,
                latestSmiles,
              )}
            />
            <TutorChat
              question={tutorQuestion(question)}
              attempt={tutorAttempt(
                latestAttempt,
                latestDrawDiagnostics,
                latestSmiles,
              )}
            />
          </>
        )}
      </article>
    </SubmitContext.Provider>
  );
}

// ---- MCQ -----------------------------------------------------------------

function McqBody({
  question,
  onAttempt,
}: {
  question: McqQuestion;
  onAttempt: (r: AttemptRecord) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; chosenId: string } | null>(null);

  const submit = useCallback(() => {
    if (!chosen) return;
    const correct = chosen === question.correctOptionId;
    setResult({ correct, chosenId: chosen });
    onAttempt({
      questionId: question.id,
      verdict: correct ? "correct" : "wrong",
      credit: correct ? 1 : 0,
      submitted: chosen,
    });
  }, [chosen, question.id, question.correctOptionId, onAttempt]);

  useRegisterSubmit({ submit, canSubmit: !!chosen });

  // After a wrong submission, let the user pick again and resubmit.
  function pick(id: string) {
    setChosen(id);
    if (result && !result.correct) setResult(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((o) => {
          const selected = chosen === o.id;
          const isCorrectResult = result?.correct && result.chosenId === o.id;
          const isWrongResult =
            result && !result.correct && result.chosenId === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-sm ${
                  isCorrectResult
                    ? "border-emerald-500 bg-emerald-50"
                    : isWrongResult
                      ? "border-red-500 bg-red-50"
                      : selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                }`}
                onClick={() => pick(o.id)}
              >
                {o.smiles && (
                  <StructureView smiles={o.smiles} width={120} height={80} />
                )}
                <span>{o.label ?? o.id}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {result && (
        <VerdictBanner
          verdict={result.correct ? "correct" : "wrong"}
          explanation={question.explanation}
        >
          {!result.correct && (
            <div className="text-xs">
              Pick another option and press Submit to try again.
            </div>
          )}
        </VerdictBanner>
      )}
    </div>
  );
}

// ---- Rank ----------------------------------------------------------------

function RankBody({
  question,
  onAttempt,
}: {
  question: RankQuestion;
  onAttempt: (r: AttemptRecord) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => question.items.map((i) => i.id));
  const [result, setResult] = useState<boolean | null>(null);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    if (result === false) setResult(null);
  }

  const submit = useCallback(() => {
    const correct = order.every((id, i) => id === question.correctOrder[i]);
    setResult(correct);
    onAttempt({
      questionId: question.id,
      verdict: correct ? "correct" : "wrong",
      credit: correct ? 1 : 0,
      submitted: order,
    });
  }, [order, question.id, question.correctOrder, onAttempt]);

  useRegisterSubmit({ submit, canSubmit: true });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Arrange low → high (use ↑/↓ to reorder).
      </p>
      <ol className="flex flex-col gap-1">
        {order.map((id, i) => {
          const item = question.items.find((it) => it.id === id);
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 rounded border border-neutral-200 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-mono text-xs text-neutral-500">{i + 1}.</span>{" "}
                {item?.label}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                  onClick={() => move(i, -1)}
                  aria-label="move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                  onClick={() => move(i, 1)}
                  aria-label="move down"
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {result !== null && (
        <VerdictBanner
          verdict={result ? "correct" : "wrong"}
          explanation={question.explanation}
        >
          {!result && (
            <div className="text-xs">
              Reorder with ↑/↓ and press Submit to try again.
            </div>
          )}
        </VerdictBanner>
      )}
    </div>
  );
}

// ---- Reagent fill --------------------------------------------------------

function ReagentFillBody({
  question,
  onAttempt,
}: {
  question: ReagentFillQuestion;
  onAttempt: (r: AttemptRecord) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<boolean | null>(null);
  const need = new Set(question.correctReagentIds);

  function toggle(id: string) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
    if (result === false) setResult(null);
  }

  const submit = useCallback(() => {
    const correct =
      chosen.size === need.size && [...chosen].every((id) => need.has(id));
    setResult(correct);
    onAttempt({
      questionId: question.id,
      verdict: correct ? "correct" : "wrong",
      credit: correct ? 1 : 0,
      submitted: [...chosen],
    });
  }, [chosen, need, question.id, onAttempt]);

  useRegisterSubmit({ submit, canSubmit: chosen.size > 0 });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {question.reagentChoices.map((r) => {
          const on = chosen.has(r.id);
          return (
            <button
              type="button"
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                on
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      {result !== null && (
        <VerdictBanner
          verdict={result ? "correct" : "wrong"}
          explanation={question.explanation}
        >
          {!result && (
            <div className="text-xs">
              Adjust your selection and press Submit to try again.
            </div>
          )}
        </VerdictBanner>
      )}
    </div>
  );
}

// ---- Draw (structure) ----------------------------------------------------

function DrawBody({
  question,
  onAttempt,
  onDiagnostics,
}: {
  question: StructureQuestion;
  onAttempt: (r: AttemptRecord) => void;
  onDiagnostics: (diagnostics: string[], smiles: string) => void;
}) {
  const ketcherRef = useRef<Ketcher | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submittedSmiles, setSubmittedSmiles] = useState<string>("");

  const gradingQuestion: QuestionForGrading = {
    id: question.id,
    answers: question.answers,
    acceptable: question.acceptable,
    reactants: question.reactants,
    ignoreStereo: question.ignoreStereo,
  };

  const submit = useCallback(async () => {
    const k = ketcherRef.current;
    if (!k) return;
    setBusy(true);
    try {
      const smiles = (await k.getSmiles()).trim();
      setSubmittedSmiles(smiles);
      if (!smiles) {
        const r: GradeResult = {
          verdict: "invalid",
          credit: 0,
          message: "Canvas is empty — draw a structure first.",
          diagnostics: ["empty-input"],
        };
        setResult(r);
        onAttempt({
          questionId: question.id,
          verdict: r.verdict,
          credit: 0,
          submitted: "",
        });
        onDiagnostics(r.diagnostics, "");
        return;
      }
      const r = await grade(smiles, gradingQuestion, rdkitCanonicalizer());
      setResult(r);
      onAttempt({
        questionId: question.id,
        verdict: r.verdict,
        credit: r.credit,
        submitted: smiles,
      });
      onDiagnostics(r.diagnostics, smiles);
    } finally {
      setBusy(false);
    }
  }, [gradingQuestion, question.id, onAttempt, onDiagnostics]);

  useRegisterSubmit({
    submit,
    canSubmit: !busy,
    label: busy ? "Grading…" : "Submit",
  });

  return (
    <div className="flex flex-col gap-3">
      <StructureEditor
        tools={toolsForQuestionType(question.type)}
        onInit={(k) => (ketcherRef.current = k)}
      />
      {result && (
        <VerdictBanner verdict={result.verdict} explanation={question.explanation}>
          <div>{result.message}</div>
          {submittedSmiles && (
            <div className="mt-1 text-xs font-mono opacity-75">
              submitted: {submittedSmiles}
            </div>
          )}
          {result.diagnostics.length > 0 && (
            <div className="mt-1 text-xs font-mono opacity-75">
              diagnostics: {result.diagnostics.join(", ")}
            </div>
          )}
          {result.verdict !== "correct" && (
            <div className="mt-1 text-xs">
              Edit your structure and press Submit to try again.
            </div>
          )}
        </VerdictBanner>
      )}
      {result && result.verdict !== "correct" && question.answers[0] && (
        <details className="rounded border border-neutral-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Show expected answer
          </summary>
          <div className="mt-3 flex items-center gap-4">
            <StructureView
              smiles={question.answers[0].smiles}
              width={200}
              height={140}
            />
            <div className="font-mono text-xs text-neutral-500">
              {question.answers[0].label ?? question.answers[0].smiles}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

// ---- Tutor request helpers ----------------------------------------------

function tutorQuestion(q: Question): TutorRequest["question"] {
  let correctAnswers: Array<{ smiles: string; label?: string }> = [];
  if (q.type === "mcq") {
    const c = q.options.find((o) => o.id === q.correctOptionId);
    if (c) correctAnswers = [{ smiles: c.smiles ?? "", label: c.label ?? c.id }];
  } else if (q.type === "rank") {
    correctAnswers = [
      {
        smiles: "",
        label: `Correct order: ${q.correctOrder
          .map((id) => q.items.find((i) => i.id === id)?.label ?? id)
          .join(" < ")}`,
      },
    ];
  } else if (q.type === "reagent_fill") {
    correctAnswers = q.correctReagentIds.map((id) => ({
      smiles: "",
      label: id,
    }));
  } else {
    const sq = q as StructureQuestion;
    correctAnswers = sq.answers.map((a) => ({ smiles: a.smiles, label: a.label }));
  }
  return {
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    reactants: q.reactants,
    reagents: q.reagents,
    correctAnswers,
    concepts: q.concepts,
    explanation: q.explanation,
  };
}

function tutorAttempt(
  latest: AttemptRecord | null,
  diagnostics: string[],
  smiles: string,
): TutorRequest["attempt"] {
  if (!latest) return null;
  return {
    smiles:
      smiles ||
      (typeof latest.submitted === "string"
        ? latest.submitted
        : JSON.stringify(latest.submitted)),
    verdict: latest.verdict,
    credit: latest.credit,
    diagnostics,
  };
}

// ---- Verdict banner ------------------------------------------------------

const BANNER_STYLE: Record<GradeResult["verdict"], string> = {
  correct: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "partial-stereo": "bg-amber-50 text-amber-800 border-amber-200",
  acceptable: "bg-sky-50 text-sky-800 border-sky-200",
  "starting-material": "bg-orange-50 text-orange-800 border-orange-200",
  wrong: "bg-red-50 text-red-800 border-red-200",
  invalid: "bg-neutral-50 text-neutral-800 border-neutral-300",
};

function VerdictBanner({
  verdict,
  explanation,
  children,
}: {
  verdict: GradeResult["verdict"];
  explanation?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded border px-4 py-3 text-sm ${BANNER_STYLE[verdict]}`}
      role="status"
    >
      <div className="font-medium capitalize">{verdict.replace("-", " ")}</div>
      {children && <div className="mt-1">{children}</div>}
      {explanation && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium">Why?</summary>
          <div className="mt-1 max-h-64 overflow-y-auto whitespace-pre-line pr-2">
            {explanation}
          </div>
        </details>
      )}
    </div>
  );
}
