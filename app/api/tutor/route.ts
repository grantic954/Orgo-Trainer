// POST /api/tutor
// Streams a Socratic tutor response for a specific Orgo 2 question.
// ANTHROPIC_API_KEY stays server-side (§2 rule 4).

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { TUTOR_SYSTEM_PROMPT } from "@/lib/tutor/system-prompt";
import type { TutorAction, TutorRequest } from "@/lib/tutor/types";

export const runtime = "nodejs";

function userTurnFor(action: TutorAction): string {
  switch (action.kind) {
    case "hint":
      return `Give me a Level ${action.level} hint per the ladder in your instructions. Do not exceed that level.`;
    case "why-wrong":
      return "Explain why my most recent attempt is wrong. Use the grader diagnostics.";
    case "explain-mechanism":
      return "Walk me through the mechanism of this reaction, using arrow-pushing language.";
    case "similar-problem":
      return "Show me one similar problem I could try. Provide it as: a prompt, the reactants, the reagents, and the expected product — but do not give me the answer, just enough to try it.";
    case "free":
      return action.text;
  }
}

function questionContext(req: TutorRequest): string {
  const { question, attempt } = req;
  const answersBlock = question.correctAnswers
    .map((a) => `  - <mol>${a.smiles}</mol>${a.label ? ` (${a.label})` : ""}`)
    .join("\n");
  const reactantsBlock = question.reactants.length
    ? question.reactants.map((s) => `  - <mol>${s}</mol>`).join("\n")
    : "  (none)";
  const attemptBlock = attempt
    ? `Student's most recent attempt: <mol>${attempt.smiles}</mol>
Grader verdict: ${attempt.verdict} (credit ${attempt.credit.toFixed(2)})
Grader diagnostics: ${attempt.diagnostics.length ? attempt.diagnostics.join(", ") : "(none)"}`
    : "Student has not submitted an attempt yet.";

  return `<question>
id: ${question.id}
type: ${question.type}
prompt: ${question.prompt}
reactants:
${reactantsBlock}
reagents: ${question.reagents.join(", ") || "(none)"}
correct answer(s):
${answersBlock}
concepts: ${question.concepts.join(", ") || "(none)"}
${question.explanation ? `authored explanation: ${question.explanation}` : ""}
</question>

<attempt>
${attemptBlock}
</attempt>`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: TutorRequest;
  try {
    body = (await req.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const priorTurns: Anthropic.MessageParam[] = body.history.map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...priorTurns,
    { role: "user", content: userTurnFor(body.action) },
  ];

  const systemWithContext = `${TUTOR_SYSTEM_PROMPT}\n\n${questionContext(body)}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 8000,
          system: systemWithContext,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          messages,
        });
        anthropicStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
        await anthropicStream.finalMessage();
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
