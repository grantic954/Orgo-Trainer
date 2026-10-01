"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearAll,
  listAttempts,
  listDueQuestionIds,
  type AttemptRow,
} from "@/lib/db";
import { CHAPTERS, chapterForTopic } from "@/lib/chapters/data";

const LS_KEY = "orgo-dashboard-chapter";

export function DashboardClient() {
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [due, setDue] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<number | "all">("all");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (saved) setSelected(saved === "all" ? "all" : Number(saved));
    reload();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, selected === "all" ? "all" : String(selected));
    }
  }, [selected]);

  async function reload() {
    const [a, d] = await Promise.all([listAttempts(5000), listDueQuestionIds()]);
    setAttempts(a);
    setDue(d);
  }

  async function handleClear() {
    if (!confirm("Clear all local progress? This cannot be undone.")) return;
    await clearAll();
    await reload();
  }

  // Filter attempts by selected chapter (via topic → chapter mapping).
  const filtered = useMemo(() => {
    if (!attempts) return [];
    if (selected === "all") return attempts;
    return attempts.filter((a) => chapterForTopic(a.topic)?.number === selected);
  }, [attempts, selected]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const correct = filtered.filter((a) => a.verdict === "correct").length;
    return { total, correct, accuracy: total === 0 ? 0 : correct / total };
  }, [filtered]);

  // Accuracy by chapter — computed across ALL attempts regardless of filter,
  // so you can see which chapters are strongest/weakest at a glance.
  const byChapter = useMemo(() => {
    if (!attempts) return [];
    const map = new Map<number, { correct: number; total: number }>();
    for (const a of attempts) {
      const ch = chapterForTopic(a.topic)?.number;
      if (ch === undefined) continue;
      const prev = map.get(ch) ?? { correct: 0, total: 0 };
      prev.total++;
      if (a.verdict === "correct") prev.correct++;
      map.set(ch, prev);
    }
    return [...map.entries()]
      .map(([ch, v]) => ({
        chapter: ch,
        title: CHAPTERS.find((c) => c.number === ch)?.title ?? "",
        correct: v.correct,
        total: v.total,
        accuracy: v.total === 0 ? 0 : v.correct / v.total,
      }))
      .sort((a, b) => a.chapter - b.chapter);
  }, [attempts]);

  const byConcept = useMemo(() => bucket(filtered, (a) => a.concepts), [filtered]);
  const byTopic = useMemo(() => bucket(filtered, (a) => [a.topic]), [filtered]);
  const byTrap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of filtered) for (const t of a.trapIds) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].map(([trap, count]) => ({ trap, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  if (!attempts || due === null) {
    return <div className="text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Current chapter:</span>
          <select
            value={selected === "all" ? "all" : String(selected)}
            onChange={(e) => setSelected(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="all">All chapters</option>
            {CHAPTERS.map((c) => (
              <option key={c.number} value={c.number}>
                Ch. {c.number} — {c.title}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-neutral-500">
          Stats below are {selected === "all" ? "across every chapter" : `scoped to Ch. ${selected}`}. Saved in your browser.
        </span>
      </section>

      {attempts.length === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
          No attempts yet. Head to <a href="/" className="font-medium text-blue-600 hover:underline">a chapter</a> to get started.
        </div>
      ) : stats.total === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
          No attempts yet in Ch. {selected}. Pick a different chapter or head there to practice.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Attempts" value={stats.total.toString()} />
            <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} />
            <Stat label="Due now (SRS)" value={due.length.toString()} />
          </section>

          {byChapter.length > 0 && selected === "all" && (
            <AccuracyBars
              title="Accuracy by chapter"
              rows={byChapter.map((r) => ({
                key: `Ch. ${r.chapter} · ${r.title}`,
                correct: r.correct,
                total: r.total,
                accuracy: r.accuracy,
              }))}
            />
          )}

          <AccuracyBars title="Accuracy by topic" rows={byTopic} />
          <AccuracyBars title="Accuracy by concept" rows={byConcept.slice(0, 20)} />

          {byTrap.length > 0 && (
            <section className="rounded border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Most frequent traps</h2>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {byTrap.slice(0, 10).map((t) => (
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
              {filtered.slice(0, 20).map((a) => (
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
        </>
      )}

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

function bucket(
  attempts: AttemptRow[],
  keyFn: (a: AttemptRow) => string[],
): Array<{ key: string; correct: number; total: number; accuracy: number }> {
  const m = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    for (const k of keyFn(a)) {
      const prev = m.get(k) ?? { correct: 0, total: 0 };
      prev.total++;
      if (a.verdict === "correct") prev.correct++;
      m.set(k, prev);
    }
  }
  return [...m.entries()]
    .map(([key, v]) => ({ key, correct: v.correct, total: v.total, accuracy: v.correct / v.total }))
    .sort((a, b) => a.accuracy - b.accuracy);
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
              <span className="truncate pr-2">{r.key}</span>
              <span className="whitespace-nowrap text-neutral-500">
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
