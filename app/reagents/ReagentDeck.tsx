"use client";

import { useMemo, useState } from "react";
import type { ReagentCard } from "@/lib/reagents/data";

export function ReagentDeck({ reagents }: { reagents: ReagentCard[] }) {
  const [shuffled, setShuffled] = useState(false);
  const deck = useMemo(() => {
    if (!shuffled) return reagents;
    const arr = [...reagents];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [reagents, shuffled]);

  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck[i % deck.length];

  function next() {
    setI((n) => (n + 1) % deck.length);
    setFlipped(false);
  }
  function prev() {
    setI((n) => (n - 1 + deck.length) % deck.length);
    setFlipped(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Card {i + 1} of {deck.length}
          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs">{card.topic}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setShuffled((s) => !s);
            setI(0);
            setFlipped(false);
          }}
          className="text-xs underline hover:text-neutral-800"
        >
          {shuffled ? "Un-shuffle" : "Shuffle"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[260px] w-full flex-col items-start gap-3 rounded-lg border border-neutral-200 bg-white p-6 text-left shadow-sm transition hover:border-neutral-300"
      >
        {!flipped ? (
          <>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Reagent</div>
            <div className="text-2xl font-semibold">{card.name}</div>
            <div className="text-sm text-neutral-500">{card.fullName}</div>
            <div className="mt-auto text-xs text-neutral-400">Click to reveal what it does</div>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              {card.name} — what it does
            </div>
            <div className="text-sm">{card.whatItDoes}</div>
            <div className="text-sm">
              <span className="font-medium">Conditions:</span> {card.conditions}
            </div>
            <div className="text-sm font-mono">{card.example}</div>
            <div className="mt-auto text-xs text-neutral-400">Click to flip back</div>
          </>
        )}
      </button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white"
        >
          Next card →
        </button>
      </div>
    </div>
  );
}
