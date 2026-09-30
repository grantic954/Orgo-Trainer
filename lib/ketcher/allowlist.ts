// Per-question-type tool allow-list.
// Ring templates are ALWAYS allowed per user request; drag-select + copy/paste
// (native Ketcher shortcuts) are always available and don't need buttons.
import type { QuestionType } from "@/lib/questions/schema";
import type { ToolId } from "./tools";

const RINGS: ToolId[] = [
  "ring-benzene",
  "ring-cyclohexane",
  "ring-cyclopentane",
  "ring-cyclobutane",
  "ring-cyclopropane",
  "ring-cycloheptane",
  "ring-furan",
  "ring-pyridine",
];

const BONDS_BASIC: ToolId[] = ["bond-single", "bond-double", "bond-triple", "bond-aromatic"];
const BONDS_STEREO: ToolId[] = ["bond-up", "bond-down"];

const ATOMS_COMMON: ToolId[] = ["atom-C", "atom-H", "atom-O", "atom-N", "atom-Br", "atom-Cl"];
const ATOMS_EXTRA: ToolId[] = ["atom-F", "atom-I", "atom-S", "atom-P"];

const OTHER_CHARGES: ToolId[] = ["charge-plus", "charge-minus"];
const OTHER_MECH: ToolId[] = ["reaction-arrow", "electron-pair"];

const SELECTION: ToolId[] = ["select-rect", "select-lasso", "erase"];

export function toolsForQuestionType(type: QuestionType): Set<ToolId> {
  const s = new Set<ToolId>([...RINGS, ...SELECTION]);
  switch (type) {
    case "draw_product":
    case "draw_starting_material":
    case "spectrum_id":
    case "multistep":
      BONDS_BASIC.forEach((t) => s.add(t));
      ATOMS_COMMON.forEach((t) => s.add(t));
      ATOMS_EXTRA.forEach((t) => s.add(t));
      OTHER_CHARGES.forEach((t) => s.add(t));
      break;
    case "stereo_draw":
      BONDS_BASIC.forEach((t) => s.add(t));
      BONDS_STEREO.forEach((t) => s.add(t));
      ATOMS_COMMON.forEach((t) => s.add(t));
      ATOMS_EXTRA.forEach((t) => s.add(t));
      OTHER_CHARGES.forEach((t) => s.add(t));
      break;
    case "mechanism":
      BONDS_BASIC.forEach((t) => s.add(t));
      ATOMS_COMMON.forEach((t) => s.add(t));
      OTHER_CHARGES.forEach((t) => s.add(t));
      OTHER_MECH.forEach((t) => s.add(t));
      break;
    default:
      // mcq/rank/reagent_fill/peak_click/count don't use the drawing editor.
      break;
  }
  return s;
}

// The "everything" set — useful for the /sandbox where there's no question.
export const ALL_TOOLS: Set<ToolId> = new Set<ToolId>([
  ...RINGS,
  ...SELECTION,
  ...BONDS_BASIC,
  ...BONDS_STEREO,
  ...ATOMS_COMMON,
  ...ATOMS_EXTRA,
  ...OTHER_CHARGES,
  ...OTHER_MECH,
]);
