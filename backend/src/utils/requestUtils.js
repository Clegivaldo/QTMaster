// Runtime CommonJS shim for tests that import '../utils/requestUtils.js'
function requireParam(req, res, name) {
  const value = (req.params || {})[name];
  if (!value) {
    if (res && typeof res.status === 'function') {
      res.status(400).json({ error: `${name} is required` });
    }
    return null;
  }
  return value;
}

function stripUndefined(obj) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

module.exports = { requireParam, stripUndefined };
