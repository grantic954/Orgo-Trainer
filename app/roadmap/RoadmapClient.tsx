"use client";

import { useState } from "react";
import type { RoadmapEdge, RoadmapNode } from "@/lib/roadmap/data";

export function RoadmapClient({
  nodes,
  edges,
}: {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const incoming = edges.filter((e) => e.to === selected);
  const outgoing = edges.filter((e) => e.from === selected);

  function label(id: string): string {
    return nodes.find((n) => n.id === id)?.label ?? id;
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Functional groups</h2>
        <div className="flex flex-wrap gap-2">
          {nodes.map((n) => {
            const active = selected === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(active ? null : n.id)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-neutral-200 bg-white hover:bg-neutral-100"
                }`}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold">
              Make {label(selected)} from…
              <span className="ml-2 text-xs text-neutral-500">({incoming.length})</span>
            </h3>
            {incoming.length === 0 && (
              <p className="mt-2 text-sm text-neutral-500">(no incoming routes in the graph)</p>
            )}
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {incoming.map((e, i) => (
                <li key={i} className="rounded border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <span className="font-medium">{label(e.from)}</span>
                  <span className="mx-2 text-neutral-400">→</span>
                  <span className="font-mono text-xs text-neutral-700">{e.reagents}</span>
                  {e.note && <div className="mt-1 text-xs text-neutral-500">{e.note}</div>}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold">
              Turn {label(selected)} into…
              <span className="ml-2 text-xs text-neutral-500">({outgoing.length})</span>
            </h3>
            {outgoing.length === 0 && (
              <p className="mt-2 text-sm text-neutral-500">(no outgoing routes in the graph)</p>
            )}
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {outgoing.map((e, i) => (
                <li key={i} className="rounded border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <span className="font-mono text-xs text-neutral-700">{e.reagents}</span>
                  <span className="mx-2 text-neutral-400">→</span>
                  <span className="font-medium">{label(e.to)}</span>
                  {e.note && <div className="mt-1 text-xs text-neutral-500">{e.note}</div>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <p className="text-sm text-neutral-500">
          Pick a functional group to see its incoming and outgoing reactions.
        </p>
      )}
    </div>
  );
}
