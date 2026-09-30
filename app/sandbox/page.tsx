import { SandboxClient } from "./SandboxClient";

export default function SandboxPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Spectra sandbox</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Draw a structure on the left. IR / ¹H NMR / ¹³C+DEPT / MS update on the right (debounced).
          Predicted, textbook-style — not real instrument data.
        </p>
      </header>
      <SandboxClient />
    </main>
  );
}
