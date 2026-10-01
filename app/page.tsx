import Link from "next/link";
import { allChapterSummaries } from "@/lib/chapters/loader";

const TOOL_LINKS = [
  { href: "/exam", label: "Exam mode" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/mechanism", label: "Mechanism arrows" },
  { href: "/reagents", label: "Reagent flashcards" },
  { href: "/roadmap", label: "Reaction roadmap" },
  { href: "/sandbox", label: "Spectra sandbox" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Home() {
  const chapters = allChapterSummaries();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Orgo 2 Trainer</h1>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Chapters
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map(({ chapter }) => (
            <li key={chapter.number}>
              <Link
                href={`/chapters/${chapter.number}`}
                className="flex h-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:shadow-sm"
              >
                <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold">
                  Ch. {chapter.number}
                </span>
                <span className="text-sm font-semibold">{chapter.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Tools
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TOOL_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-center rounded border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
