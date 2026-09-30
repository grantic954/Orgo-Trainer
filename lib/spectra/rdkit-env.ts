// Shared RDKit initializer for the spectra layer. Works in both the browser
// (loads WASM via /RDKit_minimal.wasm) and Node (reads the WASM off disk).
//
// This is a separate module from lib/chem/rdkit.ts so that the browser bundle
// isn't polluted with `node:fs` imports (statically importing those breaks
// webpack/Turbopack). Instead we `require` them dynamically only when running
// under Node.

import type { MainModule, Mol } from "@rdkit/rdkit";
import initRDKitModule from "@rdkit/rdkit";

let rdkitPromise: Promise<MainModule> | null = null;

export async function getRDKitEither(): Promise<MainModule> {
  if (rdkitPromise) return rdkitPromise;
  const isNode =
    typeof process !== "undefined" && !!(process as { versions?: { node?: string } })?.versions?.node;
  rdkitPromise = (async () => {
    if (isNode) {
      // Node path: read the WASM off disk and pass it as `wasmBinary`.
      // Use eval-based require so bundlers don't try to inline `node:fs`.
      const dynamicRequire = eval("require") as NodeRequire;
      const { readFileSync } = dynamicRequire("node:fs") as typeof import("node:fs");
      const { join } = dynamicRequire("node:path") as typeof import("node:path");
      const wasm = readFileSync(
        join(process.cwd(), "node_modules", "@rdkit", "rdkit", "dist", "RDKit_minimal.wasm"),
      );
      return initRDKitModule({
        wasmBinary: wasm,
        print: () => {},
        printErr: () => {},
      });
    }
    return initRDKitModule({ locateFile: (f: string) => `/${f}` });
  })();
  return rdkitPromise;
}

export type { MainModule, Mol };
