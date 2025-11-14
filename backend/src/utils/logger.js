// Runtime CommonJS shim for tests that import ../utils/logger.js
// Provides minimal logger API used by controllers/tests.
const noop = () => {};
const logger = {
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug(...args),
};

const logAuditEvent = (event, details) => {
  console.info('AUDIT', event, details);
};

const logSecurityEvent = (event, details) => {
  console.warn('SECURITY', event, details);
};

const logPerformanceEvent = (event, metrics) => {
  console.info('PERF', event, metrics);
};

module.exports = {
  logger,
  logAuditEvent,
  logSecurityEvent,
  logPerformanceEvent,
};
