// Phase 7 — template-based question generation endpoint.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "generate route not implemented yet (Phase 7)" },
    { status: 501 },
  );
}
