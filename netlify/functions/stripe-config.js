// Netlify Function: stripe-config
// Returns the Stripe publishable key for client-side initialisation.
// The publishable key is safe to expose to the browser — this endpoint
// simply avoids hardcoding it in source code.
//
// GET /.netlify/functions/stripe-config
// Requires env var: STRIPE_PUBLISHABLE_KEY

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!pk) return json(500, { error: 'STRIPE_PUBLISHABLE_KEY not configured' });

  return json(200, { publishableKey: pk });
};

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...cors() },
    body: JSON.stringify(body),
  };
}
