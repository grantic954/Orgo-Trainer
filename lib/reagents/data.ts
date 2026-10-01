// Typed accessor for data/reagents.json.
import reagentsRaw from "@/data/reagents.json";

export interface ReagentCard {
  id: string;
  name: string;
  fullName: string;
  whatItDoes: string;
  conditions: string;
  example: string;
  topic: string;
}

const data = reagentsRaw as { reagents: ReagentCard[] };

export function allReagents(): ReagentCard[] {
  return data.reagents;
}

export function reagentById(id: string): ReagentCard | undefined {
  return data.reagents.find((r) => r.id === id);
}

export function reagentsByTopic(): Record<string, ReagentCard[]> {
  const map: Record<string, ReagentCard[]> = {};
  for (const r of data.reagents) {
    (map[r.topic] ??= []).push(r);
  }
  return map;
}
