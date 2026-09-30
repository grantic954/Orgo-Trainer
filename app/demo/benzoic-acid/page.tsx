import { BenzoicAcidDemo } from "./BenzoicAcidDemo";

export default function BenzoicAcidDemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Phase 2 demo — draw benzoic acid
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Draw the structure in the editor, then hit Submit. The grader uses RDKit (§6 pipeline)
          — no LLM in the loop.
        </p>
      </header>
      <BenzoicAcidDemo />
    </main>
  );
}
