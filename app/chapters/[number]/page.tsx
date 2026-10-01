import Link from "next/link";
import { notFound } from "next/navigation";
import { chapterByNumber } from "@/lib/chapters/data";
import { questionsForChapter } from "@/lib/chapters/loader";
import { ChapterSession } from "./ChapterSession";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();
  const chapter = chapterByNumber(n);
  if (!chapter) notFound();
  const questions = questionsForChapter(n);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-xs text-neutral-500 hover:underline">
          ← Back to all chapters
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ch. {chapter.number} · {chapter.title}
        </h1>
        {chapter.blurb && <p className="text-sm text-neutral-500">{chapter.blurb}</p>}
      </header>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold">No questions yet in this chapter</h2>
          <p className="mt-2 text-sm text-neutral-500">
            This chapter is seeded but doesn't have practice content yet. You can still use the
            tools below for related work:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            <li>
              <Link
                href="/sandbox"
                className="rounded border border-neutral-200 bg-white px-3 py-1.5 hover:bg-neutral-50"
              >
                Spectra sandbox
              </Link>
            </li>
            <li>
              <Link
                href="/reagents"
                className="rounded border border-neutral-200 bg-white px-3 py-1.5 hover:bg-neutral-50"
              >
                Reagent flashcards
              </Link>
            </li>
            <li>
              <Link
                href="/roadmap"
                className="rounded border border-neutral-200 bg-white px-3 py-1.5 hover:bg-neutral-50"
              >
                Reaction roadmap
              </Link>
            </li>
          </ul>
        </div>
      ) : (
        <ChapterSession questions={questions} chapterNumber={chapter.number} />
      )}
    </main>
  );
}
