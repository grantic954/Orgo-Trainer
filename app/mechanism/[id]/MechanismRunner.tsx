"use client";

import { useState } from "react";
import { MechanismCanvas } from "@/components/MechanismCanvas";
import type { Mechanism } from "@/lib/mechanism/schema";

export function MechanismRunner({ mechanism }: { mechanism: Mechanism }) {
  const [i, setI] = useState(0);
  const step = mechanism.steps[i];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          Step {i + 1} of {mechanism.steps.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
            className="rounded border border-neutral-300 bg-white px-3 py-1 text-xs disabled:opacity-50"
          >
            ← prev
          </button>
          <button
            type="button"
            disabled={i >= mechanism.steps.length - 1}
            onClick={() => setI(i + 1)}
            className="rounded border border-neutral-300 bg-white px-3 py-1 text-xs disabled:opacity-50"
          >
            next →
          </button>
        </div>
      </div>
      <MechanismCanvas key={`${mechanism.id}-${i}`} step={step} />
    </div>
  );
}
