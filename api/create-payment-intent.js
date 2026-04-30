// Vercel Serverless Function: create-payment-intent
// Creates a Stripe PaymentIntent for any item in the server-side CATALOG.
// Price is validated server-side — the client never controls the charge amount.
//
// POST /api/create-payment-intent
// Body: { itemId, variant }
// Returns: { clientSecret, amount, currency }
// Requires env var: STRIPE_SECRET_KEY

const CATALOG = {
  btl: {
    title: 'Built to Last',
    type:  'book',
    variants: { Hardcover: '24.99', Paperback: '14.99', eBook: '9.99' },
  },
  bs: {
    title: 'Beyond Survival',
    type:  'book',
    variants: { Hardcover: '22.99', Paperback: '12.99', eBook: '8.99' },
  },
  // Add new sellable items here alongside create-order.js and window.CHECKOUT_CATALOG in modals.js
};

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') { respond(res, 405, { error: 'Method not allowed' }); return; }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_KEY) { respond(res, 500, { error: 'STRIPE_SECRET_KEY not configured' }); return; }

  const body    = req.body || {};
  const itemId  = String(body.itemId  || '').trim();
  const variant = String(body.variant || '').trim();

  const item = CATALOG[itemId];
  if (!item) { respond(res, 400, { error: `Unknown item: "${itemId}"` }); return; }

  const priceStr = item.variants[variant];
  if (!priceStr) { respond(res, 400, { error: `Unknown variant "${variant}" for "${item.title}"` }); return; }

  const amount = Math.round(parseFloat(priceStr) * 100);

  const authHeader = 'Basic ' + Buffer.from(STRIPE_KEY + ':').toString('base64');
  const params = new URLSearchParams({
    amount:            String(amount),
    currency:          'eur',
    'metadata[itemId]':    itemId,
    'metadata[itemTitle]': item.title,
    'metadata[itemType]':  item.type,
    'metadata[variant]':   variant,
    'automatic_payment_methods[enabled]':         'true',
    'automatic_payment_methods[allow_redirects]': 'never',
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method:  'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const pi = await stripeRes.json();

  if (!stripeRes.ok) {
    console.error('Stripe PaymentIntent creation failed:', pi.error?.message);
    respond(res, 502, { error: pi.error?.message || 'Stripe error' });
    return;
  }

  respond(res, 200, { clientSecret: pi.client_secret, amount, currency: 'eur' });
};

function respond(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(body);
}
