import { notFound } from "next/navigation";
import { loadQuestionsByTopic } from "@/lib/questions/loader";
import { PracticeSession } from "./PracticeSession";

export default async function TopicPracticePage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const questions = loadQuestionsByTopic(topic);
  if (questions.length === 0) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Practice — {topic}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {questions.length} questions. Answer, then advance.
        </p>
      </header>
      <PracticeSession questions={questions} />
    </main>
  );
}
