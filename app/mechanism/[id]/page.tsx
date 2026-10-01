import { notFound } from "next/navigation";
import { MECHANISMS } from "@/lib/mechanism/fixtures";
import { MechanismRunner } from "./MechanismRunner";

export default async function MechanismPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mech = MECHANISMS.find((m) => m.id === id);
  if (!mech) notFound();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{mech.name}</h1>
        {mech.description && (
          <p className="mt-1 text-sm text-neutral-500">{mech.description}</p>
        )}
      </header>
      <MechanismRunner mechanism={mech} />
    </main>
  );
}
