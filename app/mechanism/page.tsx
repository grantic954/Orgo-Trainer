import Link from "next/link";
import { MECHANISMS } from "@/lib/mechanism/fixtures";

export default function MechanismIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mechanism practice</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Place curly arrows to show how a step proceeds. The grader is deterministic — it checks
          that every expected (source atom, sink atom) pair you draw matches, order-independent.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {MECHANISMS.map((m) => (
          <li key={m.id}>
            <Link
              href={`/mechanism/${m.id}`}
              className="flex items-center justify-between rounded border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50"
            >
              <span>
                <span className="font-medium">{m.name}</span>
                <span className="ml-2 text-xs text-neutral-500">· {m.topic}</span>
              </span>
              <span className="text-xs text-neutral-500">{m.steps.length} step{m.steps.length === 1 ? "" : "s"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
