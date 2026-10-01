import Link from "next/link";

const PHASE_LINKS = [
  { href: "/practice", label: "Practice (hints on)", phase: "Phase 3" },
  { href: "/exam", label: "Exam (timed, no hints)", phase: "Phase 6" },
  { href: "/mistakes", label: "Mistakes (recent wrong answers)", phase: "Phase 6" },
  { href: "/sandbox", label: "Spectra Sandbox", phase: "Phase 4" },
  { href: "/dashboard", label: "Dashboard", phase: "Phase 6" },
  { href: "/demo", label: "Structure Demo (10 molecules)", phase: "Phase 1" },
  { href: "/demo/benzoic-acid", label: "Draw Benzoic Acid Demo", phase: "Phase 2" },
  { href: "/roadmap", label: "Reaction Roadmap", phase: "Phase 9" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Orgo 2 Trainer</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Phase 0 scaffold. Structure drawing, generated spectra, and an AI tutor land in later phases.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Routes
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {PHASE_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
              >
                <span className="font-medium">{link.label}</span>
                <span className="text-xs text-neutral-500">{link.phase}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
