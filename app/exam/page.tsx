import { loadAllQuestions } from "@/lib/questions/loader";
import { ExamClient } from "./ExamClient";

export default function ExamPage() {
  const all = loadAllQuestions();
  const topics = Array.from(new Set(all.map((q) => q.topic))).sort();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Exam mode</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Timed, no hints, no tutor. Review results after you finish or time runs out.
        </p>
      </header>
      <ExamClient allQuestions={all} topics={topics} />
    </main>
  );
}
