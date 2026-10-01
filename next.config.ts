import type { NextConfig } from "next";

// Ketcher-core → paper.js has a Node-only canvas.js that statically requires
// `jsdom/lib/jsdom/living/generated/utils` (and `canvas`). Paper's own
// package.json aliases these to `false` for browser builds but Turbopack
// doesn't honor the `browser` field map, so we alias them explicitly to a
// local empty shim. Turbopack expects relative-to-project paths here.
const emptyShim = "./shims/empty.js";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      jsdom: emptyShim,
      "jsdom/lib/jsdom/living/generated/utils": emptyShim,
      canvas: emptyShim,
    },
  },
};

export default nextConfig;
