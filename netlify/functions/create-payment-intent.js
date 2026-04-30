// Netlify Function: create-payment-intent
// Creates a Stripe PaymentIntent for any item in the server-side CATALOG.
// Price is validated server-side — the client never controls the charge amount.
//
// POST /.netlify/functions/create-payment-intent
// Body: { itemId, variant }
// Returns: { clientSecret, amount, currency }
//
// Requires env vars: STRIPE_SECRET_KEY
//
// ─────────────────────────────────────────────
// SERVER-SIDE CATALOG
// Keep in sync with create-order.js and window.CHECKOUT_CATALOG in modals.js.
// Add new sellable items here to make them purchaseable.
// ─────────────────────────────────────────────
const CATALOG = {
  // Books
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
  // Toolkits / digital resources — add as they become available, e.g.:
  // 'system-design-workbook': {
  //   title: 'The System Design Workbook',
  //   type:  'toolkit',
  //   variants: { PDF: '19.99' },
  // },
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_KEY) return json(500, { error: 'STRIPE_SECRET_KEY not configured' });

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const itemId  = String(body.itemId  || '').trim();
  const variant = String(body.variant || '').trim();

  const item = CATALOG[itemId];
  if (!item) return json(400, { error: `Unknown item: "${itemId}"` });

  const priceStr = item.variants[variant];
  if (!priceStr) return json(400, { error: `Unknown variant "${variant}" for "${item.title}"` });

  const amount = Math.round(parseFloat(priceStr) * 100); // Stripe expects integer cents

  // Create PaymentIntent via Stripe REST API (no npm package required)
  const authHeader = 'Basic ' + Buffer.from(STRIPE_KEY + ':').toString('base64');
  const params = new URLSearchParams({
    amount:            String(amount),
    currency:          'eur',
    'metadata[itemId]':    itemId,
    'metadata[itemTitle]': item.title,
    'metadata[itemType]':  item.type,
    'metadata[variant]':   variant,
    // automatic_payment_methods lets Stripe decide which methods to show
    // but since we use Card Element (not Payment Element), we disable redirect-based methods
    'automatic_payment_methods[enabled]':              'true',
    'automatic_payment_methods[allow_redirects]':      'never',
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method:  'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const pi = await stripeRes.json();

  if (!stripeRes.ok) {
    console.error('Stripe PaymentIntent creation failed:', pi.error?.message);
    return json(502, { error: pi.error?.message || 'Stripe error' });
  }

  return json(200, {
    clientSecret: pi.client_secret,
    amount,
    currency: 'eur',
  });
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
