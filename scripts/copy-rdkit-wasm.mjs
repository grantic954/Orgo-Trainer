// Copies the RDKit WASM bundle into /public so it's served at /RDKit_minimal.wasm.
// Runs on npm install; keeps the WASM in sync with the installed package.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "node_modules", "@rdkit", "rdkit", "dist", "RDKit_minimal.wasm");
const destDir = join(here, "..", "public");
const dest = join(destDir, "RDKit_minimal.wasm");

if (!existsSync(src)) {
  console.warn("[copy-rdkit-wasm] source missing, skipping:", src);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("[copy-rdkit-wasm] wrote", dest);
