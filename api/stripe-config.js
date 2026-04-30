// Vercel Serverless Function: stripe-config
// Returns the Stripe publishable key for client-side initialisation.
// GET /api/stripe-config
// Requires env var: STRIPE_PUBLISHABLE_KEY

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!pk) { respond(res, 500, { error: 'STRIPE_PUBLISHABLE_KEY not configured' }); return; }
  respond(res, 200, { publishableKey: pk });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
