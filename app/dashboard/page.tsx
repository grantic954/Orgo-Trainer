import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Progress by topic, concept, and trap. All data lives locally in your browser (IndexedDB).
        </p>
      </header>
      <DashboardClient />
    </main>
  );
}
