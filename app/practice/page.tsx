import Link from "next/link";
import { loadAllQuestions } from "@/lib/questions/loader";

export default function PracticePage() {
  const questions = loadAllQuestions();
  const topics = Array.from(new Set(questions.map((q) => q.topic))).sort();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {questions.length} seed questions across {topics.length} topic(s). Pick a topic to drill.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {topics.map((topic) => {
          const count = questions.filter((q) => q.topic === topic).length;
          return (
            <li key={topic}>
              <Link
                href={`/practice/${topic}`}
                className="flex items-center justify-between rounded border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50"
              >
                <span className="font-medium">{topic}</span>
                <span className="text-xs text-neutral-500">{count} questions</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
