/**
 * For requests with a body, ensure JSON was parsed (client sent Content-Type: application/json).
 * If body is empty, return a clear error so clients know to send JSON.
 */
function requireJson(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') return next();
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(415).json({
      success: false,
      message: 'Send JSON with header: Content-Type: application/json',
    });
  }
  if (req.body === undefined || req.body === null) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body. Use Content-Type: application/json and a valid JSON payload.',
    });
  }
  next();
}

module.exports = { requireJson };
