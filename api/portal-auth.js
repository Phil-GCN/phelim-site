// Vercel Serverless Function: portal-auth
// Verifies portal password against PORTAL_PASSWORD env var.
// Returns a signed time-limited token (24h) on success.
// POST /api/portal-auth  { password: "..." }
// Requires: PORTAL_PASSWORD, PORTAL_SECRET

const crypto = require('crypto');

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') { respond(res, 405, { error: 'Method not allowed' }); return; }

  const PORTAL_PW = process.env.PORTAL_PASSWORD;
  const SECRET    = process.env.PORTAL_SECRET;

  if (!PORTAL_PW || !SECRET) {
    respond(res, 500, { error: 'Portal not configured — set PORTAL_PASSWORD and PORTAL_SECRET in environment variables.' });
    return;
  }

  const body = req.body || {};
  if (!body.password) { respond(res, 400, { error: 'password required' }); return; }

  const pw       = Buffer.from(body.password);
  const expected = Buffer.from(PORTAL_PW);
  const match    = pw.length === expected.length && crypto.timingSafeEqual(pw, expected);

  if (!match) { respond(res, 401, { error: 'Incorrect password' }); return; }

  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 86400 })).toString('base64url');
  const sig     = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

  respond(res, 200, { token: payload + '.' + sig });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
