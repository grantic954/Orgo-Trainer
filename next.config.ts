import type { NextConfig } from "next";

// Ketcher-core → paper.js has a Node-only canvas.js that statically requires
// `jsdom/lib/jsdom/living/generated/utils` (and `canvas`). Paper's own
// package.json aliases these to `false` for browser builds but Turbopack
// doesn't honor the `browser` field map, so we alias them explicitly to a
// local empty shim. Turbopack expects relative-to-project paths here.
const emptyShim = "./shims/empty.js";

const nextConfig: NextConfig = {
  // Ketcher-react maintains a module-scope singleton (`ketcherProvider`) that
  // tracks every mounted Ketcher instance by id. React Strict Mode's dev-only
  // double-mount creates orphan instance references the singleton can't
  // resolve ("couldn't find ketcher instance N"). We disable strict mode so
  // the drawing editor doesn't trip over its own async init on every reload.
  reactStrictMode: false,
  turbopack: {
    resolveAlias: {
      jsdom: emptyShim,
      "jsdom/lib/jsdom/living/generated/utils": emptyShim,
      canvas: emptyShim,
    },
  },
  // Long-lived cache headers for the big static assets we serve from /public.
  // RDKit's WASM is content-addressed by filename (changes only when the
  // npm package version changes), so a year-long immutable cache is safe —
  // repeat visits don't re-download the 7 MB blob.
  async headers() {
    return [
      {
        source: "/RDKit_minimal.wasm",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
