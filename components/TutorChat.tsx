"use client";

import { useRef, useState } from "react";
import { MolText } from "@/components/MolText";
import type { TutorRequest } from "@/lib/tutor/types";

export interface TutorChatProps {
  question: TutorRequest["question"];
  attempt: TutorRequest["attempt"];
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function TutorChat({ question, attempt }: TutorChatProps) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userTurn: Turn = { role: "user", content: text };
    setHistory((h) => [...h, userTurn]);
    setInput("");
    setBusy(true);
    // reserve a streaming assistant turn
    setHistory((h) => [...h, { role: "assistant", content: "" }]);
    try {
      const body: TutorRequest = {
        action: { kind: "free", text },
        question,
        attempt,
        history: history.map((h) => ({ role: h.role, content: h.content })),
      };
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `tutor request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHistory((h) => {
          const next = [...h];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistory((h) => {
        const next = [...h];
        next[next.length - 1] = { role: "assistant", content: `[error: ${msg}]` };
        return next;
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <header className="text-sm font-semibold">Ask about this problem</header>

      {history.length > 0 && (
        <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto rounded border border-neutral-200 bg-neutral-50 p-3">
          {history.map((t, i) => (
            <div
              key={i}
              className={`rounded px-3 py-2 text-sm ${
                t.role === "user" ? "bg-blue-50 self-end" : "bg-white border border-neutral-200"
              }`}
            >
              {t.role === "assistant" ? <MolText text={t.content || "…"} /> : t.content}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Ask a follow-up… (Shift+Enter for newline)"
          className="flex-1 rounded border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          disabled={busy}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </section>
  );
}
