"use client";

import { useEffect, useState } from "react";
import {
  clearAll,
  computeAggregates,
  listDueQuestionIds,
  type Aggregates,
} from "@/lib/db";

export function DashboardClient() {
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [due, setDue] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [a, d] = await Promise.all([computeAggregates(), listDueQuestionIds()]);
    setAgg(a);
    setDue(d);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleClear() {
    if (!confirm("Clear all local progress? This cannot be undone.")) return;
    await clearAll();
    await reload();
  }

  if (loading || !agg || due === null) {
    return <div className="text-sm text-neutral-500">Loading…</div>;
  }

  if (agg.totalAttempts === 0) {
    return (
      <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
        No attempts yet. Head to <a href="/practice" className="font-medium text-blue-600 hover:underline">Practice</a> to get started.
      </div>
    );
  }

  const overallAccuracy = agg.totalAttempts ? agg.totalCorrect / agg.totalAttempts : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Attempts" value={agg.totalAttempts.toString()} />
        <Stat label="Accuracy" value={`${Math.round(overallAccuracy * 100)}%`} />
        <Stat label="Due now" value={due.length.toString()} />
      </section>

      <AccuracyBars title="Accuracy by topic" rows={agg.byTopic} />
      <AccuracyBars title="Accuracy by concept" rows={agg.byConcept.slice(0, 20)} />

      {agg.byTrap.length > 0 && (
        <section className="rounded border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Most frequent traps</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {agg.byTrap.slice(0, 10).map((t) => (
              <li key={t.trap} className="flex items-center justify-between">
                <span className="font-mono text-xs">{t.trap}</span>
                <span className="text-neutral-500">{t.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Recent attempts</h2>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {agg.recentAttempts.slice(0, 20).map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between border-b border-neutral-100 py-1 last:border-0"
            >
              <span className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${verdictColor(a.verdict)}`} />
                <span className="font-mono text-xs text-neutral-500">{a.questionId}</span>
                <span className="text-xs text-neutral-500">· {a.topic}</span>
              </span>
              <span className="text-xs text-neutral-500">
                {new Date(a.timestamp).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Clear all local progress
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function AccuracyBars({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; correct: number; total: number; accuracy: number }>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-mono">{r.key}</span>
              <span className="text-neutral-500">
                {Math.round(r.accuracy * 100)}% · {r.correct}/{r.total}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-neutral-100">
              <div
                className={`h-full ${r.accuracy >= 0.8 ? "bg-emerald-500" : r.accuracy >= 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.max(2, r.accuracy * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function verdictColor(v: string): string {
  if (v === "correct") return "bg-emerald-500";
  if (v === "partial-stereo" || v === "acceptable") return "bg-amber-500";
  if (v === "starting-material") return "bg-orange-500";
  return "bg-red-500";
}
