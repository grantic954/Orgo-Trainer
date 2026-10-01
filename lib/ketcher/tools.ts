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
  | "hand"            // pointer: click an atom/bond to select one, drag empty space for a selection box
  | "erase"
  | "chain"          // draw a variable-length chain (click + drag)
  | "bond-single"
  | "bond-double"
  | "bond-triple"
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
  | "lone-pair"
  | "ring-benzene"
  | "ring-cyclohexane"
  | "ring-cyclopentane"
  | "ring-cyclobutane"
  | "ring-cyclopropane"
  | "ring-cycloheptane";

// Molfile-standard bond type and stereo codes (from Bond.PATTERN in
// ketcher-core; hardcoded here to avoid pulling ketcher-core into module
// scope).
const BOND_TYPE = { SINGLE: 1, DOUBLE: 2, TRIPLE: 3 } as const;
const BOND_STEREO = { NONE: 0, UP: 1, DOWN: 6 } as const;
// Reaction-arrow mode constants (matching Ketcher's RxnArrowMode enum).
const RXN_ARROW_OPEN_ANGLE = "open-angle";

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
    case "ring-cycloheptane": {
      const struct = await getRingStruct(id);
      if (struct) e.tool("template", { struct });
      return;
    }
    // Selection — opts is a plain string ("rectangle" | "lasso" | "fragment").
    case "select-rect":
      e.tool("select", "rectangle");
      return;
    case "select-lasso":
      e.tool("select", "lasso");
      return;
    case "hand":
      // Mouse-pointer tool: click an atom/bond to select it; drag empty
      // space to draw a selection box over multiple items. Backed by
      // Ketcher's standard rectangle-select, which handles both.
      e.tool("select", "rectangle");
      return;
    case "erase":
      e.tool("eraser", 1);
      return;
    // Chain — draw a variable-length chain of carbons (click + drag).
    case "chain":
      e.tool("chain");
      return;
    // Bonds — opts is { type, stereo } with molfile-standard numeric codes.
    case "bond-single":
      e.tool("bond", { type: BOND_TYPE.SINGLE, stereo: BOND_STEREO.NONE });
      return;
    case "bond-double":
      e.tool("bond", { type: BOND_TYPE.DOUBLE, stereo: BOND_STEREO.NONE });
      return;
    case "bond-triple":
      e.tool("bond", { type: BOND_TYPE.TRIPLE, stereo: BOND_STEREO.NONE });
      return;
    case "bond-up":
      e.tool("bond", { type: BOND_TYPE.SINGLE, stereo: BOND_STEREO.UP });
      return;
    case "bond-down":
      e.tool("bond", { type: BOND_TYPE.SINGLE, stereo: BOND_STEREO.DOWN });
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
    // Charges — opts is a signed integer (+1 or -1).
    case "charge-plus":
      e.tool("charge", 1);
      return;
    case "charge-minus":
      e.tool("charge", -1);
      return;
    case "reaction-arrow":
      e.tool("reactionarrow", RXN_ARROW_OPEN_ANGLE);
      return;
    case "lone-pair":
      // Ketcher doesn't ship a dedicated lone-pair annotation tool and lone
      // pairs aren't a drawing primitive in the molfile format. On
      // heteroatoms (O / N / S) they're always implicit from valence and
      // show automatically where needed; explicit lone-pair curly-arrows
      // for mechanism drawing land in Phase 8 (MechanismCanvas).
      // eslint-disable-next-line no-alert
      alert(
        "Lone pairs on O / N / S heteroatoms are implicit (based on valence) " +
          "and don't need to be drawn. Explicit lone-pair annotations for " +
          "mechanism arrows will be in the Mechanism canvas (Phase 8)."
      );
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
