// Programmatic Ketcher tool activation. Small wrappers over
// ketcher.editor.tool(name, opts) so our custom toolbar doesn't have to
// know Ketcher's tool-name conventions.
import type { Ketcher } from "ketcher-core";
import { getRingStruct } from "./templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EditorAny = any;

function ed(k: Ketcher): EditorAny {
  return (k as unknown as { editor: EditorAny }).editor;
}

export type ToolId =
  | "select-rect"
  | "select-lasso"
  | "erase"
  | "bond-single"
  | "bond-double"
  | "bond-triple"
  | "bond-aromatic"
  | "bond-up"        // wedge up (stereo)
  | "bond-down"      // hashed down (stereo)
  | "atom-C"
  | "atom-H"
  | "atom-O"
  | "atom-N"
  | "atom-F"
  | "atom-Cl"
  | "atom-Br"
  | "atom-I"
  | "atom-S"
  | "atom-P"
  | "charge-plus"
  | "charge-minus"
  | "reaction-arrow"
  | "electron-pair"
  | "ring-benzene"
  | "ring-cyclohexane"
  | "ring-cyclopentane"
  | "ring-cyclobutane"
  | "ring-cyclopropane"
  | "ring-cycloheptane"
  | "ring-furan"
  | "ring-pyridine";

export async function activateTool(k: Ketcher, id: ToolId): Promise<void> {
  const e = ed(k);
  switch (id) {
    // Rings — activate Ketcher's template tool with the ring Struct so the
    // user clicks on the canvas to place it (or fuses onto an existing bond).
    case "ring-benzene":
    case "ring-cyclohexane":
    case "ring-cyclopentane":
    case "ring-cyclobutane":
    case "ring-cyclopropane":
    case "ring-cycloheptane":
    case "ring-furan":
    case "ring-pyridine": {
      const struct = await getRingStruct(id);
      if (struct) e.tool("template", { struct });
      return;
    }
    // Selection
    case "select-rect":
      e.tool("select", { mode: "rectangle" });
      return;
    case "select-lasso":
      e.tool("select", { mode: "lasso" });
      return;
    case "erase":
      e.tool("eraser");
      return;
    // Bonds
    case "bond-single":
      e.tool("bond", { type: "single" });
      return;
    case "bond-double":
      e.tool("bond", { type: "double" });
      return;
    case "bond-triple":
      e.tool("bond", { type: "triple" });
      return;
    case "bond-aromatic":
      e.tool("bond", { type: "aromatic" });
      return;
    case "bond-up":
      e.tool("bond", { stereo: "up", type: "single" });
      return;
    case "bond-down":
      e.tool("bond", { stereo: "down", type: "single" });
      return;
    // Atoms
    case "atom-C":
    case "atom-H":
    case "atom-O":
    case "atom-N":
    case "atom-F":
    case "atom-Cl":
    case "atom-Br":
    case "atom-I":
    case "atom-S":
    case "atom-P":
      e.tool("atom", { label: id.slice(5) });
      return;
    // Other
    case "charge-plus":
      e.tool("charge", { mode: "plus" });
      return;
    case "charge-minus":
      e.tool("charge", { mode: "minus" });
      return;
    case "reaction-arrow":
      e.tool("reactionarrow", { mode: "reaction-arrow-open-angle" });
      return;
    case "electron-pair":
      // Ketcher exposes lone-pair drawing as a "chain" or "rgroup" — neither
      // fits perfectly. As a Phase-1 UX, we no-op with a console hint so it's
      // obvious this needs revisit for mechanism-arrow questions.
      // eslint-disable-next-line no-console
      console.info("electron-pair tool: use Ketcher's built-in R-group or charge tools; TODO wire.");
      return;
  }
}

export async function undo(k: Ketcher): Promise<void> {
  ed(k).undo?.();
}
export async function redo(k: Ketcher): Promise<void> {
  ed(k).redo?.();
}
export async function clearCanvas(k: Ketcher): Promise<void> {
  await k.setMolecule("");
}
