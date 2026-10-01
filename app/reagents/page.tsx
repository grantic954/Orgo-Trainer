import { allReagents } from "@/lib/reagents/data";
import { ReagentDeck } from "./ReagentDeck";

export default function ReagentsPage() {
  const reagents = allReagents();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reagent flashcards</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {reagents.length} reagents. Click a card to flip. Use next / previous to cycle.
        </p>
      </header>
      <ReagentDeck reagents={reagents} />
    </main>
  );
}
