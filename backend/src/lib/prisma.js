// Compatibility shim for runtime imports that reference '../lib/prisma.js'
// This forwards to the TypeScript module so tests and runtime requiring the .js path work.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./prisma');
  module.exports = mod;
} catch (e) {
  // Fallback: export an empty object to avoid crashes in environments where TS isn't resolved
  module.exports = {};
}
