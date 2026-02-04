/**
 * If the body is wrapped in a sample key (e.g. {"minimal": {"title": "..."}}),
 * unwrap it so validation and controller see the inner task object.
 */
const SAMPLE_KEYS = ['minimal', 'with_description', 'with_status', 'completed', 'pending'];

function unwrapSamplePayload(req, res, next) {
  if (req.method !== 'POST' || !req.body || typeof req.body !== 'object') return next();
  const keys = Object.keys(req.body);
  if (keys.length === 1 && SAMPLE_KEYS.includes(keys[0]) && typeof req.body[keys[0]] === 'object') {
    req.body = { ...req.body[keys[0]] };
  }
  next();
}

module.exports = { unwrapSamplePayload };
