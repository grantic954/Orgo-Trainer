import { loadAllQuestions } from "@/lib/questions/loader";
import { MistakesClient } from "./MistakesClient";

export default function MistakesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mistakes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Redo questions where your most recent attempt was wrong.
        </p>
      </header>
      <MistakesClient allQuestions={loadAllQuestions()} />
    </main>
  );
}
