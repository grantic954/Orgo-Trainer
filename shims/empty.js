// Browser shim for Node-only modules (jsdom, canvas) that ketcher-core's
// paper.js dependency statically requires. Those code paths are never
// executed in the browser; this empty module satisfies the bundler.
module.exports = {};
