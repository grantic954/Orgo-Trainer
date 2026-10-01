// Phase 7 — reaction-template question generation endpoint.
//
// POST /api/generate
// Body: { templateId: string, substrateSmiles: string[] }
// Response: { question: GeneratedQuestion } | { error: string }
//
// This runs the generator server-side (RDKit WASM boots in node) and
// returns a draft question. The validator pipeline (lib/questions/schema +
// scripts/validate-questions) still polices the output before it enters
// the authored bank.

import { NextResponse, type NextRequest } from "next/server";
import { REACTION_TEMPLATES } from "@/lib/generate/templates";
import { SUBSTRATES } from "@/lib/generate/substrates";
import { generateFromTemplate } from "@/lib/generate/generate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { templateId?: string; substrateSmiles?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tpl = REACTION_TEMPLATES.find((t) => t.id === body.templateId);
  if (!tpl) {
    return NextResponse.json(
      { error: `unknown templateId '${body.templateId}'. Known: ${REACTION_TEMPLATES.map((t) => t.id).join(", ")}` },
      { status: 400 },
    );
  }
  const smiles = body.substrateSmiles ?? [];
  const substrates = smiles.map((s) =>
    SUBSTRATES.find((sub) => sub.smiles === s) ?? { smiles: s, name: s, classes: [] },
  );

  try {
    const question = await generateFromTemplate(tpl, substrates);
    if (!question) {
      return NextResponse.json({ error: "generator failed to produce a product" }, { status: 422 });
    }
    return NextResponse.json({ question });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    templates: REACTION_TEMPLATES.map(({ id, topic, name, reagents, concepts }) => ({
      id,
      topic,
      name,
      reagents,
      concepts,
    })),
    substrates: SUBSTRATES.map(({ smiles, name, classes }) => ({ smiles, name, classes })),
  });
}
