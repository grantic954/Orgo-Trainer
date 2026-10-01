import { ROADMAP_NODES, ROADMAP_EDGES } from "@/lib/roadmap/data";
import { RoadmapClient } from "./RoadmapClient";

export default function RoadmapPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reaction roadmap</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Functional-group interconversions. Click a node to see every reaction that leads to or
          from it.
        </p>
      </header>
      <RoadmapClient nodes={ROADMAP_NODES} edges={ROADMAP_EDGES} />
    </main>
  );
}
