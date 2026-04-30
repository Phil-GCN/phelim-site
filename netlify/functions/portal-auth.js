// Netlify Function: portal-auth
// Verifies portal password against PORTAL_PASSWORD env var.
// Returns a signed time-limited token (24h) on success.
// Requires: PORTAL_PASSWORD, PORTAL_SECRET (both set in Netlify env)
//
// POST /.netlify/functions/portal-auth  { password: "..." }
// → 200 { token: "base64payload.hmac" }
// → 401 { error: "Incorrect password" }

const crypto = require('crypto');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return res(405, { error: 'Method not allowed' });

  const PORTAL_PW = process.env.PORTAL_PASSWORD;
  const SECRET    = process.env.PORTAL_SECRET;

  if (!PORTAL_PW || !SECRET) {
    return res(500, { error: 'Portal not configured — set PORTAL_PASSWORD and PORTAL_SECRET in Netlify environment variables.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return res(400, { error: 'Invalid JSON' }); }

  if (!body.password) return res(400, { error: 'password required' });

  // Constant-time comparison to prevent timing attacks
  const pw        = Buffer.from(body.password);
  const expected  = Buffer.from(PORTAL_PW);
  const match     = pw.length === expected.length && crypto.timingSafeEqual(pw, expected);

  if (!match) return res(401, { error: 'Incorrect password' });

  // Build a signed token: base64url(payload) + '.' + HMAC-SHA256(secret, payload)
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 86400 })).toString('base64url');
  const sig     = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

  return res(200, { token: payload + '.' + sig });
};

function res(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
